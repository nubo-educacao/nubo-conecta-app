'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { applyMask, validateMask, getPlaceholder, getMaxLength, getComponentType } from '@/utils/maskUtils';

export interface PartnerFormField {
    id: string;
    partner_id: string;
    step_id: string | null;
    field_name: string;
    question_text: string;
    data_type: string;
    options: string[] | { rows: string[]; columns: string[] } | null;
    mapping_source: string | null;
    is_criterion: boolean;
    criterion_rule: Record<string, unknown> | null;
    conditional_rule: Record<string, unknown> | null;
    sort_order: number;
    optional: boolean;
    maskking: string | null;
}

interface FormFieldRendererProps {
    field: PartnerFormField;
    isIterable: boolean;
    stepId: string;
    iterationIndex: number;
    onValidationError?: (errors: { question: string; error: string }[]) => void;
}

export default function FormFieldRenderer({
    field,
    isIterable,
    stepId,
    iterationIndex,
}: FormFieldRendererProps) {
    const { control, formState: { errors } } = useFormContext();

    const fieldName = isIterable
        ? `${stepId}.${iterationIndex}.${field.field_name}`
        : field.field_name;

    const componentType = getComponentType(field.maskking, field.data_type);
    const isButtonField =
        field.data_type === 'boolean' ||
        field.data_type === 'multiselect' ||
        field.data_type === 'grid_select' ||
        field.data_type === 'grid_multiselect';

    const hasError = isIterable
        ? !!(errors as Record<string, Record<number, Record<string, unknown>>>)?.[stepId]?.[iterationIndex]?.[field.field_name]
        : !!errors?.[field.field_name as keyof typeof errors];

    const innerInputClass = `w-full outline-none bg-transparent text-[#3A424E] text-sm md:text-base
        py-1.5 md:py-4 px-1 md:px-4
        md:rounded-xl md:border-2 md:bg-white/60 md:backdrop-blur-sm md:transition-all md:duration-200
        ${hasError
            ? 'md:border-red-400 md:ring-2 md:ring-red-100'
            : 'md:border-gray-200 md:focus:border-[#38B1E4] md:focus:ring-2 md:focus:ring-[#38B1E4]/20'
        }`;

    return (
        <Controller
            control={control}
            name={fieldName}
            rules={{
                required: !field.optional,
                validate: (value) => {
                    const stringVal = String(value || '');
                    if (!field.optional && stringVal.trim() === '') return false;

                    const isGrid = field.data_type === 'grid_select' || field.data_type === 'grid_multiselect';
                    if (isGrid && !field.optional) {
                        const gridOpts = field.options as { rows?: string[] };
                        const rowCount = gridOpts?.rows?.length || 0;
                        const gridAnswers: Record<string, unknown> =
                            typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
                        const answeredRows = Object.keys(gridAnswers).filter(k => {
                            const v = gridAnswers[k];
                            if (Array.isArray(v)) return v.length > 0;
                            return v !== undefined && v !== null && String(v).trim() !== '';
                        }).length;
                        return answeredRows >= rowCount;
                    }

                    if (field.maskking && stringVal.trim() !== '') {
                        const { isValid } = validateMask(stringVal, field.maskking);
                        return isValid;
                    }
                    return true;
                },
            }}
            render={({ field: rhfField }) => {
                const { value, onChange, onBlur } = rhfField;
                const parentStringValue = value !== undefined && value !== null ? String(value) : '';

                const [isDropdownOpen, setIsDropdownOpen] = useState(false);
                const dropdownRef = useRef<HTMLDivElement>(null);

                useEffect(() => {
                    function handleClickOutside(event: MouseEvent) {
                        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                            setIsDropdownOpen(false);
                        }
                    }
                    document.addEventListener('mousedown', handleClickOutside);
                    return () => document.removeEventListener('mousedown', handleClickOutside);
                }, []);

                const handleTextChange = (
                    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
                ) => {
                    const rawVal = e.target.value;
                    const type = field.maskking?.toLowerCase();
                    let processedValue = rawVal;

                    if (type && ['cpf', 'cnpj', 'phone', 'cep', 'number'].includes(type)) {
                        processedValue = rawVal.replace(/\D/g, '');
                    }

                    const maskedValue =
                        field.maskking && type !== 'date'
                            ? applyMask(processedValue, field.maskking)
                            : processedValue;
                    const maxLength = getMaxLength(field.maskking);
                    const finalValue =
                        maxLength && type !== 'date' ? maskedValue.slice(0, maxLength) : maskedValue;

                    onChange(finalValue);
                };

                const handleMultiSelectToggle = (opt: string, checked: boolean) => {
                    const currentArr = Array.isArray(value)
                        ? value
                        : typeof value === 'string' && value
                            ? value.split(',').map((s: string) => s.trim())
                            : [];
                    const nextArray = checked
                        ? [...new Set([...currentArr, opt])]
                        : currentArr.filter((v: string) => v !== opt);
                    onChange(nextArray);
                };

                const handleGridToggle = (rowIndex: number, columnValue: string, isMulti: boolean) => {
                    const currentVal: Record<string, string | string[]> =
                        typeof value === 'object' && value !== null ? { ...(value as Record<string, string | string[]>) } : {};
                    const rowKey = String(rowIndex);

                    if (isMulti) {
                        const currentArr = Array.isArray(currentVal[rowKey]) ? (currentVal[rowKey] as string[]) : [];
                        const has = currentArr.includes(columnValue);
                        currentVal[rowKey] = has
                            ? currentArr.filter(v => v !== columnValue)
                            : [...currentArr, columnValue];
                    } else {
                        currentVal[rowKey] = columnValue;
                    }
                    onChange(currentVal);
                };

                return (
                    <motion.fieldset
                        key={field.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`relative min-w-0 transition-all duration-200 group
                            ${isButtonField ? 'border-0 p-0 mt-0' : 'border-2 rounded-xl px-3 pb-1 pt-0 mt-3 bg-white/60 backdrop-blur-sm'}
                            ${hasError
                                ? isButtonField ? '' : 'border-red-400 focus-within:ring-2 focus-within:ring-red-100'
                                : isButtonField ? '' : 'border-gray-200 focus-within:border-[#38B1E4] focus-within:ring-2 focus-within:ring-[#38B1E4]/20'
                            }
                            md:border-0 md:p-0 md:mt-0 md:bg-transparent md:backdrop-blur-none
                            md:focus-within:ring-0 md:focus-within:border-transparent`}
                    >
                        <legend className={`
                            px-1 text-[11px] md:text-sm font-bold transition-all duration-200
                            ${hasError ? 'text-red-500' : 'text-[#024F86] group-focus-within:text-[#38B1E4] md:group-focus-within:text-[#024F86]'}
                            ${isButtonField ? 'bg-transparent mb-1' : 'bg-[#fcfdfe]'}
                            max-w-full whitespace-normal leading-tight rounded-sm
                            md:px-0 md:bg-transparent md:mb-2 md:block`}
                        >
                            {field.question_text}
                            {!field.optional && <span className="text-red-400 ml-0.5">*</span>}
                        </legend>

                        <div className={isButtonField ? 'pt-1' : 'pt-1 md:pt-0'}>
                            {field.data_type === 'boolean' ||
                            field.data_type === 'multiselect' ||
                            componentType === 'grid'
                                ? null
                                : componentType === 'date'
                                ? (
                                    <input
                                        type="date"
                                        value={parentStringValue}
                                        onChange={handleTextChange}
                                        onBlur={onBlur}
                                        className={innerInputClass}
                                    />
                                ) : componentType === 'textarea'
                                ? (
                                    <div className="relative">
                                        <textarea
                                            value={parentStringValue}
                                            onChange={handleTextChange}
                                            onBlur={onBlur}
                                            className={innerInputClass + ' min-h-[120px] resize-none'}
                                            placeholder={getPlaceholder(field.maskking, field.data_type)}
                                            maxLength={500}
                                        />
                                        <div className={`absolute bottom-2 right-3 text-[10px] font-medium ${parentStringValue.length >= 500 ? 'text-red-500' : 'text-[#3A424E]/40'}`}>
                                            {parentStringValue.length}/500
                                        </div>
                                    </div>
                                ) : componentType === 'select'
                                ? (
                                    <select
                                        value={parentStringValue}
                                        onChange={handleTextChange}
                                        onBlur={onBlur}
                                        className={innerInputClass + ' appearance-none cursor-pointer'}
                                    >
                                        <option value="">Selecione uma opção...</option>
                                        {(Array.isArray(field.options) ? field.options : []).map((opt: string, i: number) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : componentType === 'autocomplete'
                                ? (
                                    <div className="relative" ref={dropdownRef}>
                                        <input
                                            type="text"
                                            value={parentStringValue}
                                            onChange={(e) => { onChange(e.target.value); setIsDropdownOpen(true); }}
                                            onBlur={onBlur}
                                            onClick={() => setIsDropdownOpen(true)}
                                            className={innerInputClass}
                                            placeholder={getPlaceholder(field.maskking, field.data_type)}
                                        />
                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, scaleY: 0.95 }}
                                                    animate={{ opacity: 1, scaleY: 1 }}
                                                    exit={{ opacity: 0, scaleY: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                                                    style={{ transformOrigin: 'top' }}
                                                >
                                                    {(() => {
                                                        const filtered = (Array.isArray(field.options) ? field.options : []).filter((opt: string) =>
                                                            opt.toLowerCase().includes(parentStringValue.toLowerCase())
                                                        );
                                                        if (filtered.length === 0) {
                                                            return <div className="p-4 text-sm text-gray-400 text-center">Nenhuma opção encontrada</div>;
                                                        }
                                                        return filtered.map((opt: string, i: number) => (
                                                            <div
                                                                key={i}
                                                                onClick={() => { onChange(opt); setIsDropdownOpen(false); }}
                                                                className="px-4 py-3 md:py-4 text-sm md:text-base text-[#3A424E] hover:bg-[#38B1E4]/5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                                            >
                                                                {opt}
                                                            </div>
                                                        ));
                                                    })()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <input
                                        type={
                                            field.maskking?.toLowerCase() === 'email' ? 'email' :
                                            field.maskking?.toLowerCase() === 'link' ? 'url' :
                                            field.maskking?.toLowerCase() === 'phone' ? 'tel' : 'text'
                                        }
                                        inputMode={
                                            ['phone', 'cpf', 'cnpj', 'cep'].includes(field.maskking?.toLowerCase() || '')
                                                ? 'numeric' : undefined
                                        }
                                        value={parentStringValue}
                                        onChange={handleTextChange}
                                        onBlur={onBlur}
                                        className={innerInputClass}
                                        placeholder={getPlaceholder(field.maskking, field.data_type)}
                                        maxLength={getMaxLength(field.maskking)}
                                    />
                                )
                            }

                            {field.data_type === 'multiselect' && (
                                <div className="grid grid-cols-1 gap-2 pt-2">
                                    {(Array.isArray(field.options) ? field.options : []).map((opt: string, i: number) => {
                                        const currentArray = Array.isArray(value) ? value : [];
                                        const selected = currentArray.includes(opt);
                                        return (
                                            <label
                                                key={i}
                                                className={`flex items-center gap-3 px-4 py-2.5 md:py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200
                                                    ${selected ? 'border-[#38B1E4] bg-[#38B1E4]/5' : 'border-gray-200 bg-white/60 hover:border-gray-300'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(e) => handleMultiSelectToggle(opt, e.target.checked)}
                                                    onBlur={onBlur}
                                                    className="w-4 h-4 text-[#38B1E4] rounded border-gray-300 focus:ring-[#38B1E4]"
                                                />
                                                <span className="text-xs md:text-sm font-medium text-[#3A424E]">{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {field.data_type === 'boolean' && (
                                <div className="flex gap-2 pt-2">
                                    {['Sim', 'Não'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => onChange(opt)}
                                            className={`flex-1 px-4 py-2.5 md:py-3.5 rounded-xl border-2 text-xs md:text-sm font-bold transition-all duration-200
                                                ${parentStringValue === opt
                                                    ? 'border-[#38B1E4] bg-[#38B1E4]/10 text-[#024F86]'
                                                    : 'border-gray-200 bg-white/60 text-[#3A424E] hover:border-gray-300'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {componentType === 'grid' &&
                                field.options &&
                                typeof field.options === 'object' &&
                                !Array.isArray(field.options) &&
                                (() => {
                                    const gridOpts = field.options as { rows: string[]; columns: string[] };
                                    const rows = gridOpts.rows || [];
                                    const columns = gridOpts.columns || [];
                                    const isMulti = field.data_type === 'grid_multiselect';
                                    const gridAnswers: Record<string, string | string[]> =
                                        typeof value === 'object' && value !== null ? (value as Record<string, string | string[]>) : {};

                                    return (
                                        <div className="pt-2 overflow-x-auto -mx-1">
                                            <table className="w-full border-collapse text-xs md:text-sm">
                                                <thead>
                                                    <tr>
                                                        <th className="text-left p-2 md:p-3 min-w-[140px] md:min-w-[200px]"></th>
                                                        {columns.map((col, ci) => (
                                                            <th key={ci} className="p-1.5 md:p-2 text-center text-[10px] md:text-xs font-semibold text-[#024F86] min-w-[60px] md:min-w-[80px]">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, ri) => {
                                                        const rowKey = String(ri);
                                                        const rowAnswer = gridAnswers[rowKey];
                                                        const selectedValues = isMulti
                                                            ? (Array.isArray(rowAnswer) ? rowAnswer : [])
                                                            : [];
                                                        const selectedSingle = !isMulti
                                                            ? (typeof rowAnswer === 'string' ? rowAnswer : '')
                                                            : '';
                                                        return (
                                                            <tr key={ri} className={`border-t border-gray-100 ${ri % 2 === 0 ? 'bg-white/40' : 'bg-gray-50/40'}`}>
                                                                <td className="p-2 md:p-3 text-[#3A424E] font-medium leading-tight">
                                                                    {ri + 1}) {row}
                                                                </td>
                                                                {columns.map((col, ci) => (
                                                                    <td key={ci} className="p-1.5 md:p-2 text-center">
                                                                        <label className="flex items-center justify-center cursor-pointer">
                                                                            <input
                                                                                type={isMulti ? 'checkbox' : 'radio'}
                                                                                name={isMulti ? undefined : `grid_${fieldName}_row_${ri}`}
                                                                                checked={isMulti ? selectedValues.includes(col) : selectedSingle === col}
                                                                                onChange={() => handleGridToggle(ri, col, isMulti)}
                                                                                className="w-4 h-4 md:w-5 md:h-5 text-[#38B1E4] border-gray-300 focus:ring-[#38B1E4] cursor-pointer"
                                                                            />
                                                                        </label>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()
                            }

                            {hasError && (
                                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                    <AlertCircle size={12} />
                                    Este campo é obrigatório
                                </p>
                            )}
                        </div>
                    </motion.fieldset>
                );
            }}
        />
    );
}
