"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle2, User, Users, ExternalLink } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PartnerFormEngine, { type PartnerStep } from "@/components/forms/PartnerFormEngine";
import { type PartnerFormField } from "@/components/forms/FormFieldRenderer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { evaluateJsonLogic } from "@/utils/jsonLogic";
import { trackAndRedirect } from "@/services/redirectService";
import { OpportunityPhaseStepper } from "@/components/OpportunityPhaseStepper";
import { generateMatch } from "@/services/matchService";
import OpportunityCarousel from "@/components/home/OpportunityCarousel";

interface ApplicationState {
  id: string;
  status: string;
  answers: Record<string, unknown>;
  partner_id: string;
  partner_name: string;
  user_id?: string;
  external_redirect?: { enabled: boolean; url?: string };
  phase_id?: string | null;
}

type PagePhase = "loading" | "form" | "submitting" | "submitted" | "error";

interface UserProfile {
  id: string;
  full_name: string;
  isdependent: boolean;
}

export default function PartnerFormsPage() {
  const { id: applicationId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { activeProfileId, setActiveProfileId, profiles } = useProfile();

  const [phase, setPhase] = useState<PagePhase>("loading");
  const [steps, setSteps] = useState<PartnerStep[]>([]);
  const [fields, setFields] = useState<PartnerFormField[]>([]);
  const [application, setApplication] = useState<ApplicationState | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [formKey, setFormKey] = useState<string>("");
  const [stepIndex, setStepIndex] = useState(0);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [betterOpportunities, setBetterOpportunities] = useState<any[]>([]);
  const [loadingPhrase, setLoadingPhrase] = useState("Estamos preenchendo sua aplicação...");

  useEffect(() => {
    if (phase !== "submitting") return;

    const phrases = [
      "Estamos preenchendo sua aplicação...",
      "Calculando seus critérios de elegibilidade...",
      "Estamos calculando seu match..."
    ];
    let idx = 0;
    setLoadingPhrase(phrases[0]);

    const interval = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setLoadingPhrase(phrases[idx]);
    }, 1500);

    return () => clearInterval(interval);
  }, [phase]);

  const localStorageKey = `nubo_draft_${application?.partner_id}_${formKey}`;

  useEffect(() => {
    // user is guaranteed by AuthGuard in (protected) layout

    const boot = async () => {
      // 1. Fetch Application
      const { data: existingApp, error: appErr } = await supabase
        .from("student_applications")
        .select(`
          id, status, answers, partner_id, user_id, phase_id,
          partner_opportunities:partner_id ( name, external_redirect_config )
        `)
        .eq("id", applicationId)
        .single();

      if (appErr || !existingApp) {
        setPhase("error");
        return;
      }

      const rawOpp = existingApp.partner_opportunities;
      const opp = Array.isArray(rawOpp) ? rawOpp[0] : rawOpp;
      const appState: ApplicationState = {
        id: existingApp.id,
        status: existingApp.status,
        answers: existingApp.answers as Record<string, unknown>,
        partner_id: existingApp.partner_id,
        partner_name: opp?.name ?? "Candidatura",
        user_id: existingApp.user_id,
        phase_id: existingApp.phase_id,
        external_redirect: opp?.external_redirect_config as ApplicationState['external_redirect'],
      };

      setApplication(appState);

      // Fetch phases regardless, since we need them in both form and submitted states
      const { data: phasesData } = await supabase
        .from("opportunity_phases")
        .select("id, name, sort_order")
        .eq("opportunity_id", appState.partner_id)
        .order("sort_order");
        
      setPhases(phasesData || []);

      if (["SUBMITTED", "APPROVED", "redirected"].includes(appState.status)) {
        setPhase("submitted");
        return;
      }

      // 2. Fetch Steps and Fields using partner_id
      const [stepsRes, fieldsRes] = await Promise.all([
        supabase
          .from("partner_steps")
          .select("*")
          .eq("partner_id", appState.partner_id)
          .order("sort_order"),
        supabase
          .from("partner_forms")
          .select("*")
          .eq("partner_id", appState.partner_id)
          .order("sort_order")
      ]);

      const loadedFields = (fieldsRes.data as PartnerFormField[]) || [];
      setSteps(stepsRes.data as PartnerStep[] || []);
      setFields(loadedFields);

      // Initialize selected profile from ProfileContext or application user_id
      const initialProfileId = activeProfileId ?? existingApp.user_id ?? user!.id;
      setSelectedProfileId(initialProfileId);
      setFormKey(initialProfileId);

      // Fetch profile data
      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", initialProfileId)
        .maybeSingle();

      if (profileRow) {
        setProfileData(profileRow);
      }

      setPhase("form");
    };

    boot();
  }, [user, applicationId]);

  // ── Profile change ─────────────────────────────────────────────────────────
  const handleProfileChange = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setActiveProfileId(profileId);
    if (!application) return;

    // Fetch new profile data
    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    let newProfileData: Record<string, any> = {};
    if (profileRow) {
      newProfileData = profileRow;
    }

    // 1. Build mapped data for the new profile using loaded fields
    const newMappedData: Record<string, any> = {};
    if (profileRow && fields.length > 0) {
      fields.forEach(field => {
        if (field.mapping_source && field.mapping_source.startsWith("user_profiles.")) {
          const column = field.mapping_source.split(".")[1];
          const value = profileRow[column];
          if (value !== undefined && value !== null) {
            newMappedData[field.field_name] = value;
          }
        }
      });
    }

    // 2. Merge into application answers
    const updatedAnswers = {
      ...application.answers,
      ...newMappedData
    };

    // Sync localStorage draft for the new profile to prevent stale draft from overwriting new mapped values
    try {
      const targetLocalStorageKey = `nubo_draft_${application.partner_id}_${profileId}`;
      const existingLsDraft = JSON.parse(localStorage.getItem(targetLocalStorageKey) ?? "{}");
      const updatedLsDraft = { ...existingLsDraft, ...newMappedData };
      localStorage.setItem(targetLocalStorageKey, JSON.stringify(updatedLsDraft));
    } catch (e) {
      console.error("Failed to sync localStorage draft:", e);
    }

    // Update all local states synchronously in a single batch
    setProfileData(newProfileData);
    setApplication(prev => prev ? { ...prev, user_id: profileId, answers: updatedAnswers } : null);
    setFormKey(profileId);

    // Update student_applications row in the background (non-blocking for instant click feedback)
    supabase
      .from("student_applications")
      .update({ 
        user_id: profileId,
        answers: updatedAnswers
      })
      .eq("id", application.id)
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error("Failed to update student application in background:", error);
        }
      });
  };

  // ── Draft save ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async (data: Record<string, unknown>) => {
    if (!application) return;
    await supabase.rpc("update_student_application_answers", {
      p_application_id: application.id,
      p_answers: data,
    });
  };

  // ── Eligibility computation ─────────────────────────────────────────────────
  const computeEligibility = (data: Record<string, unknown>) => {
    const criterionFields = fields.filter((f) => f.is_criterion && f.criterion_rule && f.criterion_type !== 'priority');
    const evalData = { ...profileData, ...data };
    
    return criterionFields
      .filter((f) => {
        if (f.conditional_rule) {
          try {
            if (!evaluateJsonLogic(f.conditional_rule, evalData)) return false;
          } catch {
            // fallback
          }
        }
        return data[f.field_name] !== undefined && data[f.field_name] !== null;
      })
      .map((f) => {
        const userAnswer = data[f.field_name];
        let displayAnswer = String(userAnswer);
        
        // Try parsing if it's a string that looks like our object
        let parsedObj = typeof userAnswer === 'string' && userAnswer.includes('per_capita_income') 
          ? (() => { try { return JSON.parse(userAnswer); } catch { return null; } })()
          : (typeof userAnswer === 'object' ? userAnswer : null);

        if (f.ui_component === 'income_calculator' || (parsedObj && typeof parsedObj.per_capita_income === 'number')) {
          if (parsedObj && typeof parsedObj.per_capita_income === 'number') {
            displayAnswer = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsedObj.per_capita_income);
          }
        }

        let met = false;
        try {
          const ruleData = { ...evalData, [f.field_name]: userAnswer };
          if (parsedObj) {
            ruleData[f.field_name] = parsedObj;
          }
          met = !!evaluateJsonLogic(f.criterion_rule!, ruleData);
        } catch { /* rule evaluation failed — treat as unmet */ }
        return {
          question_text: f.question_text,
          met,
          user_answer: displayAnswer,
        };
      });
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const isRedirect = !!application?.external_redirect?.enabled;

  const handleSubmitForm = async (data: Record<string, unknown>) => {
    if (!application) return { success: false };

    setPhase("submitting");

    const finalStatus = isRedirect ? 'redirected' : 'SUBMITTED';
    const eligibilityResults = computeEligibility(data);

    // Pre-open the window to bypass popup blocker
    let redirectWindow: Window | null = null;
    if (isRedirect && application.external_redirect?.url) {
      redirectWindow = window.open('about:blank', '_blank');
    }

    try {
      const { data: result, error } = await supabase.rpc("submit_application_v1", {
        p_application_id: application.id,
        p_answers: data,
        p_final_status: finalStatus,
      });

      if (error || !result?.success) {
        if (redirectWindow) redirectWindow.close();
        setPhase("form");
        return { success: false };
      }

      // Save eligibility results and map data to user profile
      const userId = selectedProfileId || user!.id;

      // Save eligibility results directly to student_applications
      if (eligibilityResults && eligibilityResults.length > 0) {
        await supabase
          .from("student_applications")
          .update({ eligibility_results: eligibilityResults })
          .eq("id", application.id);
      }

      // 1. Build profile updates from field mappings
      const profileUpdates: Record<string, any> = {};
      const userPrefUpdates: Record<string, any> = {};
      const userIncomeUpdates: Record<string, any> = {};
      const userEnemUpdates: Record<string, any> = {};
      const authUserUpdates: Record<string, any> = {};

      fields.forEach(field => {
        const userAnswer = data[field.field_name];
        if (userAnswer === undefined || userAnswer === null) return;

        let val = userAnswer;
        if (typeof userAnswer === 'string') {
          try {
            const parsed = JSON.parse(userAnswer);
            if (parsed && typeof parsed === 'object') {
              val = parsed;
            }
          } catch {}
        }

        // Map to user_profiles columns
        if (field.mapping_source?.startsWith("user_profiles.")) {
          const column = field.mapping_source.split(".")[1];
          profileUpdates[column] = (val && typeof val === 'object' && column in val) ? (val as any)[column] : val;
        }
        // Map to user_preferences json key
        else if (field.mapping_source?.startsWith("user_preferences.")) {
          const jsonKey = field.mapping_source.split(".")[1];
          userPrefUpdates[jsonKey] = (val && typeof val === 'object' && jsonKey in val) ? (val as any)[jsonKey] : val;
        }
        // Map to user_income columns
        else if (field.mapping_source?.startsWith("user_income.")) {
          const column = field.mapping_source.split(".")[1];
          userIncomeUpdates[column] = (val && typeof val === 'object' && column in val) ? (val as any)[column] : val;
        }
        // Map to user_enem_scores columns
        else if (field.mapping_source?.startsWith("user_enem_scores.")) {
          const column = field.mapping_source.split(".")[1];
          userEnemUpdates[column] = (val && typeof val === 'object' && column in val) ? (val as any)[column] : val;
        }
        // Map to auth.users columns
        else if (field.mapping_source?.startsWith("auth.users.")) {
          const column = field.mapping_source.split(".")[1];
          authUserUpdates[column] = (val && typeof val === 'object' && column in val) ? (val as any)[column] : val;
        }
      });

      // 2. Upsert user_profiles
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert({ id: userId, ...profileUpdates }, { onConflict: "id" });

        if (profileError) {
          console.error("Failed to upsert user profile:", profileError);
        }
      }

      // 3. Update user_preferences (upsert json)
      if (Object.keys(userPrefUpdates).length > 0) {
        const { data: existingPrefs } = await supabase
          .from("user_preferences")
          .select("preferences")
          .eq("user_id", userId)
          .maybeSingle();

        const mergedPrefs = {
          ...(existingPrefs?.preferences ?? {}),
          ...userPrefUpdates
        };

        const { error: prefError } = await supabase
          .from("user_preferences")
          .upsert({
            user_id: userId,
            preferences: mergedPrefs
          });

        if (prefError) {
          console.error("Failed to update user preferences:", prefError);
        }
      }

      // 4. Upsert user_income
      if (Object.keys(userIncomeUpdates).length > 0) {
        const { error: incomeError } = await supabase
          .from("user_income")
          .upsert({ user_id: userId, ...userIncomeUpdates }, { onConflict: "user_id" });

        if (incomeError) {
          console.error("Failed to upsert user income:", incomeError);
        }
      }

      // 5. Upsert user_enem_scores
      if (Object.keys(userEnemUpdates).length > 0) {
        const year = userEnemUpdates.year || new Date().getFullYear();
        const { error: enemError } = await supabase
          .from("user_enem_scores")
          .upsert({ user_id: userId, year, ...userEnemUpdates }, { onConflict: "user_id,year" });

        if (enemError) {
          console.error("Failed to upsert user ENEM scores:", enemError);
        }
      }

      // 6. Update auth user if email or phone is mapped
      if (Object.keys(authUserUpdates).length > 0) {
        const updatePayload: Record<string, any> = {};
        if (authUserUpdates.email) updatePayload.email = authUserUpdates.email;
        if (authUserUpdates.phone) updatePayload.phone = authUserUpdates.phone;

        if (Object.keys(updatePayload).length > 0) {
          const { error: authError } = await supabase.auth.updateUser(updatePayload);
          if (authError) {
            console.error("Failed to update auth user info:", authError);
          }
        }
      }

      // 7. Call generateMatch to run the match calculation
      let matches: any[] = [];
      try {
        matches = await generateMatch(userId);
      } catch (matchErr) {
        console.error("Failed to generate match:", matchErr);
      }

      // 8. Fetch better opportunities (score > current score)
      if (matches.length > 0) {
        const currentMatch = matches.find(m => m.unified_opportunity_id === application.partner_id);
        const currentScore = currentMatch?.match_score ?? 0;

        const betterMatches = matches.filter(m => m.unified_opportunity_id !== application.partner_id && m.match_score > currentScore);

        if (betterMatches.length > 0) {
          const ids = betterMatches.map(m => m.unified_opportunity_id);
          const { data: opps } = await supabase
            .from('v_unified_opportunities')
            .select('*')
            .in('unified_id', ids);

          if (opps) {
            const sortedOpps = opps
              .map((opp: any) => {
                const match = betterMatches.find(m => m.unified_opportunity_id === opp.unified_id);
                return {
                  ...opp,
                  match_score: match?.match_score ?? 0
                };
              })
              .filter((opp: any) => opp.status === 'opened' || opp.status === 'incoming')
              .sort((a: any, b: any) => b.match_score - a.match_score);

            setBetterOpportunities(sortedOpps);
          }
        }
      }

      if (isRedirect && application.external_redirect?.url) {
        try {
          const { url } = await trackAndRedirect(
            userId,
            application.partner_id,
            application.external_redirect.url,
            'partner_application'
          );
          if (redirectWindow) {
            redirectWindow.location.href = url;
          }
        } catch (trackErr) {
          console.error("Failed to track redirect:", trackErr);
          if (redirectWindow) {
            redirectWindow.location.href = application.external_redirect.url;
          }
        }
      }
    } catch (err) {
      if (redirectWindow) redirectWindow.close();
      setPhase("form");
      return { success: false };
    }

    setPhase("submitted");
    return { success: true, eligibilityResults };
  };

  // ── Merge localStorage draft ───────────────────────────────────────────────
  const defaultValues = (() => {
    const dbAnswers = application?.answers ?? {};
    if (!application) return dbAnswers;

    try {
      const lsDraft = JSON.parse(localStorage.getItem(localStorageKey) ?? "{}");
      return {
        ...dbAnswers,
        ...lsDraft
      };
    } catch {
      return dbAnswers;
    }
  })();

  if (phase === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#38B1E4]" />
        </div>
      </AppShell>
    );
  }

  if (phase === "submitting") {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={32} className="animate-spin text-[#38B1E4]" />
          <p className="text-sm font-semibold text-gray-600 animate-pulse">{loadingPhrase}</p>
        </div>
      </AppShell>
    );
  }

  if (phase === "error") {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <p className="text-sm font-semibold text-[#024F86] mb-3">
            Não foi possível carregar o formulário
          </p>
        </div>
      </AppShell>
    );
  }

  if (phase === "submitted") {
    const isRedirected = application?.status === 'redirected';
    const redirectUrl = application?.external_redirect?.url;

    return (
      <AppShell title={isRedirected ? "Redirecionamento" : "Candidatura enviada"}>
        <div className="flex flex-col items-center justify-center py-16 md:py-24 px-4 sm:px-6 max-w-4xl mx-auto w-full gap-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 flex flex-col items-center text-center relative overflow-hidden mx-auto"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#024F86] to-[#38B1E4]" />

            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
            >
              <CheckCircle2 size={40} className="text-green-500" strokeWidth={2.5} />
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-black text-[#024F86] mb-3 tracking-tight"
            >
              {isRedirected ? 'Tudo pronto!' : 'Candidatura enviada!'}
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-[#3A424E]/70 mb-8 leading-relaxed"
            >
              {isRedirected ? (
                <>
                  Você está sendo redirecionado para o portal oficial de <strong className="text-[#024F86]">{application?.partner_name}</strong>. Finalize sua inscrição por lá.
                </>
              ) : (
                <>
                  Sua candidatura para <strong className="text-[#024F86]">{application?.partner_name}</strong> foi registrada e seu match foi atualizado com sucesso.
                </>
              )}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col w-full gap-3"
            >
              {isRedirected && redirectUrl && (
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  Acessar link da inscrição
                </a>
              )}
              
              <button
                onClick={() => router.push("/candidaturas")}
                className={`w-full py-3.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isRedirected && redirectUrl 
                    ? "bg-gray-50 text-[#3A424E] border border-gray-200 hover:bg-gray-100 hover:text-[#024F86]" 
                    : "bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02]"
                }`}
              >
                Ver minhas candidaturas
              </button>
            </motion.div>

            {/* Stepper only if there are phases */}
            {phases && phases.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="w-full mt-4 border-t border-gray-100 pt-4"
              >
                <p className="text-xs font-semibold text-gray-500 mb-2">Próximos passos do processo:</p>
                <OpportunityPhaseStepper 
                  phases={phases} 
                  currentPhaseId={application?.phase_id || null} 
                  initialStepLabel={isRedirected ? "Estudante Redirecionado" : "Candidatura Enviada"}
                />
              </motion.div>
            )}
          </motion.div>

          {/* MatchResult / MatchCarousel */}
          {betterOpportunities.length > 0 && (
            <div className="w-full mt-4 max-w-2xl mx-auto">
              <OpportunityCarousel
                title="Melhores opções para você"
                opportunities={betterOpportunities}
              />
              <p className="text-[10px] text-center text-[#3A424E]/50 mt-1.5 font-medium">
                Matches mais prováveis
              </p>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // phase === "form"
  return (
    <AppShell title={application?.partner_name ?? "Candidatura"}>
      <div className="h-full flex flex-col">
        <button
          onClick={() => router.push("/candidaturas")}
          className="flex items-center gap-1 text-xs text-[#3A424E]/60 px-4 pt-4 mb-2 hover:text-[#024F86] transition-colors"
        >
          <ArrowLeft size={14} /> Minhas candidaturas
        </button>

        {/* ── Titularidade ── */}
        {stepIndex === 0 && profiles.length > 0 && (
          <div className="px-4 pt-2 pb-4">
            <p className="text-[11px] text-[#707A7E] font-bold uppercase mb-2">Candidatura para</p>
            <div className="flex gap-3">
              {/* Para mim */}
              <button
                onClick={() => handleProfileChange(user!.id)}
                className={`flex-1 flex items-center gap-2 p-3 rounded-2xl border-[1.1px] text-left transition-all ${
                  selectedProfileId === user!.id
                    ? "border-[#38B1E4] bg-[rgba(56,177,228,0.05)]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  selectedProfileId === user!.id ? "bg-[#38B1E4]" : "bg-gray-100"
                }`}>
                  <User size={15} className={selectedProfileId === user!.id ? "text-white" : "text-gray-400"} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-bold truncate ${
                    selectedProfileId === user!.id ? "text-[#38B1E4]" : "text-[#3a424e]"
                  }`}>
                    {profiles.find(p => p.id === user!.id)?.full_name ?? "Para mim"}
                  </p>
                </div>
              </button>

              {/* Dependente */}
              {profiles.filter(p => p.isdependent).length > 0 && (
                <div className={`flex-1 flex items-center gap-2 p-3 rounded-2xl border-[1.1px] transition-all ${
                  selectedProfileId !== user!.id
                    ? "border-[#38B1E4] bg-[rgba(56,177,228,0.05)]"
                    : "border-gray-200"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selectedProfileId !== user!.id ? "bg-[#38B1E4]" : "bg-gray-100"
                  }`}>
                    <Users size={15} className={selectedProfileId !== user!.id ? "text-white" : "text-gray-400"} />
                  </div>
                  <select
                    data-testid="dependent-select"
                    className="flex-1 bg-transparent text-[11px] text-[#707a7e] outline-none font-medium"
                    value={selectedProfileId === user!.id ? "" : selectedProfileId}
                    onChange={(e) => e.target.value && handleProfileChange(e.target.value)}
                  >
                    <option value="" disabled>Dependente...</option>
                    {profiles.filter(p => p.isdependent).map(d => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 px-4 pb-4">
          {application && (
            <PartnerFormEngine
              key={formKey}
              partnerName={application.partner_name}
              applicationId={application.id}
              opportunityId={application.partner_id}
              steps={steps}
              fields={fields}
              defaultValues={defaultValues}
              dbAnswers={application.answers}
              localStorageKey={localStorageKey}
              onSaveDraft={handleSaveDraft}
              onSubmitForm={handleSubmitForm}
              onComputeEligibility={fields.some(f => f.is_criterion) ? computeEligibility : undefined}
              isRedirectFlow={isRedirect}
              onStepIndexChange={setStepIndex}
              userContextData={profileData}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
