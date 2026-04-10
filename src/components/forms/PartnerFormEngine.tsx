'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, ChevronRight, ChevronLeft,
    CheckCircle2, XCircle, Send, Plus, Loader2,
} from 'lucide-react';
import { evaluateJsonLogic } from '@/utils/jsonLogic';
import FormFieldRenderer, { type PartnerFormField } from './FormFieldRenderer';

export interface PartnerStep {
    id: string;
    partner_id: string;
    step_name: string;
    sort_order: number;
    introduction?: string | null;
    secret_step?: boolean;
    is_iterable?: boolean;
    repeat_limit?: number | null;
    conditional_rule?: Record<string, unknown> | null;
}

interface EligibilityResult {
    question_text: string;
    met: boolean;
    user_answer?: string;
}

interface FormEngineProps {
    partnerName: string;
    applicationId: string;
    steps: PartnerStep[];
    fields: PartnerFormField[];
    defaultValues: Record<string, unknown>;
    localStorageKey: string;
    onSaveDraft: (data: Record<string, unknown>) => Promise<void>;
    onSubmitForm: (data: Record<string, unknown>) => Promise<{ success: boolean; eligibilityResults?: EligibilityResult[] }>;
    onComputeEligibility?: (data: Record<string, unknown>) => EligibilityResult[];
    onStepChange?: (stepName: string) => void;
    onValidationError?: (errors: { question: string; error: string }[]) => void;
}

const sendSystemIntent = (
    type: 'step_change' | 'validation_error' | 'submit',
    metadata: Record<string, unknown>
) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('cloudinha-intent', {
            detail: { intent_type: 'system_intent', type, metadata },
        })
    );
};

export default function PartnerFormEngine({
    partnerName,
    applicationId,
    steps,
    fields,
    defaultValues,
    localStorageKey,
    onSaveDraft,
    onSubmitForm,
    onComputeEligibility,
    onStepChange,
    onValidationError,
}: FormEngineProps) {
    const methods = useForm({ defaultValues, mode: 'onSubmit' });
    const { handleSubmit, control, trigger, getValues } = methods;
    const watchedValues = useWatch({ control });

    const liveAnswers = useMemo(
        () => ({ ...defaultValues, ...watchedValues }),
        [defaultValues, watchedValues]
    );

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentIteration, setCurrentIteration] = useState(0);
    const [showReview, setShowReview] = useState(false);
    const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    // Field changes → localStorage only (no network)
    const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
        lsTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(localStorageKey, JSON.stringify(getValues()));
            } catch {
                // quota exceeded — silent
            }
        }, 400);
        return () => {
            if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
        };
    }, [watchedValues, localStorageKey, getValues]);

    const evaluationData = useMemo(() => {
        const flat: Record<string, unknown> = {};
        Object.keys(liveAnswers).forEach(key => {
            if (!Array.isArray(liveAnswers[key])) flat[key] = liveAnswers[key];
        });
        steps.forEach(step => {
            if (step.is_iterable && Array.isArray(liveAnswers[step.id])) {
                const iterations = liveAnswers[step.id] as Record<string, unknown>[];
                if (iterations.length > 0) Object.assign(flat, iterations[0]);
            }
        });
        flat['_iteration_index'] = 0;
        flat['is_first_iteration'] = true;
        return flat;
    }, [liveAnswers, steps]);

    const visibleSteps = useMemo(() => {
        return steps.filter(s => {
            if (s.secret_step) return false;
            if (s.conditional_rule) {
                try { return evaluateJsonLogic(s.conditional_rule, evaluationData); } catch { return true; }
            }
            return true;
        });
    }, [steps, evaluationData]);

    const currentStep = visibleSteps[currentStepIndex] || null;

    const currentIterationData = useMemo(() => {
        if (!currentStep?.is_iterable) return evaluationData;
        const iterations = (liveAnswers[currentStep.id] as Record<string, unknown>[]) || [];
        return {
            ...evaluationData,
            ...(iterations[currentIteration] || {}),
            _iteration_index: currentIteration,
            is_first_iteration: currentIteration === 0,
        };
    }, [evaluationData, currentStep, currentIteration, liveAnswers]);

    const currentFields = useMemo(() => {
        const base = !currentStep
            ? fields.filter(f => !f.step_id || !steps.find(s => s.id === f.step_id))
            : fields.filter(f => f.step_id === currentStep.id);

        return base.filter(f => {
            if (f.conditional_rule) {
                try { return evaluateJsonLogic(f.conditional_rule, currentIterationData); } catch { return true; }
            }
            return true;
        });
    }, [fields, currentStep, steps, currentIterationData]);

    const totalSteps = visibleSteps.length;
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 100;
    const isLastStep = currentStepIndex >= visibleSteps.length - 1;

    const handleNext = async () => {
        const fieldPaths = currentFields.map(f =>
            currentStep?.is_iterable
                ? `${currentStep.id}.${currentIteration}.${f.field_name}`
                : f.field_name
        );

        const isValid = await trigger(fieldPaths as Parameters<typeof trigger>[0], { shouldFocus: false });

        if (!isValid) {
            const currentErrors = methods.formState.errors;
            const collectedErrors: { question: string; error: string }[] = [];
            for (const field of currentFields) {
                const path = currentStep?.is_iterable
                    ? `${currentStep.id}.${currentIteration}.${field.field_name}`
                    : field.field_name;
                const error = path.split('.').reduce(
                    (obj: Record<string, unknown>, key) => (obj?.[key] as Record<string, unknown>),
                    currentErrors as unknown as Record<string, unknown>
                );
                if (error) {
                    collectedErrors.push({
                        question: field.question_text,
                        error: (error as { message?: string }).message || 'Este campo é obrigatório',
                    });
                }
            }
            if (collectedErrors.length > 0) {
                onValidationError?.(collectedErrors);
                sendSystemIntent('validation_error', { errors: collectedErrors, applicationId });
            }
            return;
        }

        // Step transition → persist draft to DB
        setSavingDraft(true);
        try {
            await onSaveDraft(getValues() as Record<string, unknown>);
        } finally {
            setSavingDraft(false);
        }

        if (isLastStep) {
            if (onComputeEligibility) {
                setEligibilityResults(onComputeEligibility(getValues() as Record<string, unknown>));
            }
            setShowReview(true);
        } else {
            const nextIndex = currentStepIndex + 1;
            const nextStep = visibleSteps[nextIndex];
            setCurrentStepIndex(nextIndex);
            setCurrentIteration(0);
            if (nextStep) {
                onStepChange?.(nextStep.step_name);
                sendSystemIntent('step_change', {
                    step: nextStep.step_name,
                    stepIndex: nextIndex,
                    total: totalSteps,
                    applicationId,
                });
            }
        }
    };

    const handlePrev = () => {
        if (showReview) { setShowReview(false); return; }
        if (currentIteration > 0) { setCurrentIteration(prev => prev - 1); return; }
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
            const prevStep = visibleSteps[currentStepIndex - 1];
            if (prevStep?.is_iterable) {
                const iterations = (getValues() as Record<string, unknown[]>)[prevStep.id] || [];
                setCurrentIteration(Math.max(0, iterations.length - 1));
            } else {
                setCurrentIteration(0);
            }
        }
    };

    const handleAddIteration = async () => {
        const fieldPaths = currentFields.map(f => `${currentStep?.id}.${currentIteration}.${f.field_name}`);
        const isValid = await trigger(fieldPaths as Parameters<typeof trigger>[0]);
        if (!isValid) return;
        setCurrentIteration(prev => prev + 1);
    };

    const submitFinalForm = async (data: Record<string, unknown>) => {
        if (submitting) return;
        setSubmitting(true);
        sendSystemIntent('submit', { applicationId, partnerName });
        try {
            const result = await onSubmitForm(data);
            if (result.success) {
                if (result.eligibilityResults) setEligibilityResults(result.eligibilityResults);
                setIsSubmitted(true);
                // Clean up localStorage draft
                try { localStorage.removeItem(localStorageKey); } catch { /* noop */ }
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (showReview) {
        const metCount = eligibilityResults.filter(r => r.met).length;
        const totalCount = eligibilityResults.length;

        return (
            <div className="bg-transparent md:bg-white/30 backdrop-blur-md md:border border-white/20 md:shadow-lg md:rounded-2xl p-4 md:p-6 flex flex-col h-full">
                <div className="text-center mb-4">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-10 h-10 bg-[#024F86]/10 rounded-full flex items-center justify-center mx-auto mb-2"
                    >
                        <CheckCircle2 className="text-[#024F86]" size={20} />
                    </motion.div>
                    <h2 className="text-base font-bold text-[#024F86]">Revisão</h2>
                    <p className="text-[10px] text-[#3A424E]/70 mt-0.5">
                        Confira antes de enviar para <strong>{partnerName}</strong>
                    </p>
                </div>

                {eligibilityResults.length > 0 ? (
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                        <div className={`p-3 rounded-xl border-2 text-center mb-2 ${metCount === totalCount ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
                            <p className="text-base font-bold text-[#024F86]">{metCount}/{totalCount} critérios atendidos</p>
                        </div>
                        {eligibilityResults.map((result, idx) => (
                            <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border-2 ${result.met ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                {result.met
                                    ? <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                                    : <XCircle className="text-red-400 shrink-0" size={16} />
                                }
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-[#3A424E] truncate">{result.question_text}</p>
                                    <p className="text-[10px] text-[#3A424E]/60 truncate">{result.user_answer || '—'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center flex-col justify-center text-center">
                        <p className="text-sm text-[#024F86] mb-2 font-medium">Tudo pronto para enviar!</p>
                        <p className="text-xs text-gray-500">Suas respostas serão registradas e seu match será atualizado.</p>
                    </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                    {!isSubmitted && (
                        <button
                            onClick={handlePrev}
                            className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-gray-200 text-[#3A424E] text-[11px] font-bold hover:bg-gray-50 transition-all"
                        >
                            <ChevronLeft size={14} /> Voltar
                        </button>
                    )}
                    <button
                        onClick={handleSubmit(submitFinalForm as Parameters<typeof handleSubmit>[0])}
                        disabled={submitting || isSubmitted}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-[11px] font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {submitting
                            ? <Loader2 className="animate-spin" size={14} />
                            : isSubmitted
                            ? 'Candidatura enviada!'
                            : <><Send size={14} /> Enviar Candidatura</>
                        }
                    </button>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <div className="bg-transparent md:bg-white/30 backdrop-blur-md md:border border-white/20 md:shadow-lg md:rounded-2xl p-4 md:p-6 lg:p-8 flex flex-col h-full">
                {/* Header */}
                <div className="mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#024F86]/10 rounded-full flex items-center justify-center shrink-0">
                            <FileText className="text-[#024F86]" size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm md:text-base font-bold text-[#024F86] truncate leading-tight">
                                {partnerName}
                            </h2>
                            {currentStep && (
                                <p className="text-[9px] md:text-xs text-[#3A424E]/60 flex items-center flex-wrap gap-x-2 mt-0.5">
                                    <span>
                                        Etapa {currentStepIndex + 1}/{totalSteps}:{' '}
                                        <span className="font-semibold">{currentStep.step_name}</span>
                                    </span>
                                    {currentStep.is_iterable && (
                                        <span className="px-1.5 py-0.5 bg-[#024F86]/10 rounded-full text-[8px] md:text-[10px] font-bold text-[#024F86]">
                                            #{currentIteration + 1}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        {savingDraft && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[10px] text-gray-500 font-medium flex items-center gap-1"
                            >
                                <Loader2 size={10} className="animate-spin" /> Salvando...
                            </motion.div>
                        )}
                    </div>

                    {totalSteps > 1 && (
                        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    )}
                </div>

                {/* Fields */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep?.id || `${currentStepIndex}-${currentIteration}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4 md:space-y-6 pt-4 md:pt-6"
                        >
                            {currentStep?.introduction && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl bg-[#024F86]/5 border border-[#024F86]/10 text-xs text-[#024F86]"
                                >
                                    {currentStep.introduction}
                                </motion.div>
                            )}

                            {currentFields.length === 0 ? (
                                <div className="text-center py-6 text-[#3A424E]/60 text-xs">
                                    Nenhum campo nesta etapa.
                                </div>
                            ) : (
                                currentFields.map(field => (
                                    <FormFieldRenderer
                                        key={field.id}
                                        field={field}
                                        isIterable={!!currentStep?.is_iterable}
                                        stepId={currentStep?.id || ''}
                                        iterationIndex={currentIteration}
                                    />
                                ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0 pt-4 md:pt-6 border-t border-gray-100">
                    <div className="flex gap-2 md:gap-3 flex-1 md:flex-initial">
                        {(currentStepIndex > 0 || currentIteration > 0) && (
                            <button
                                onClick={handlePrev}
                                className="flex items-center justify-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full border-2 border-gray-200 text-[#3A424E] text-[11px] md:text-sm font-bold hover:bg-gray-50 transition-all flex-1 md:flex-none"
                            >
                                <ChevronLeft size={16} /> Voltar
                            </button>
                        )}
                        {currentStep?.is_iterable &&
                            (!currentStep.repeat_limit || currentIteration + 1 < currentStep.repeat_limit) && (
                                <button
                                    onClick={handleAddIteration}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full border-2 border-[#38B1E4] text-[#024F86] text-[11px] md:text-sm font-bold hover:bg-[#38B1E4]/5 transition-all"
                                >
                                    <Plus size={16} className="text-[#38B1E4]" />
                                    <span className="md:hidden">Outro</span>
                                    <span className="hidden md:inline">Responder mais 1 vez</span>
                                </button>
                            )}
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex-[2] md:flex-none w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 px-4 md:px-8 py-2.5 md:py-3.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-[11px] md:text-sm font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                    >
                        {isLastStep ? (
                            <>
                                <span className="md:hidden">Revisar</span>
                                <span className="hidden md:inline">Revisar e Enviar</span>
                                <ChevronRight size={16} />
                            </>
                        ) : (
                            <>Próximo <ChevronRight size={16} /></>
                        )}
                    </button>
                </div>
            </div>
        </FormProvider>
    );
}
