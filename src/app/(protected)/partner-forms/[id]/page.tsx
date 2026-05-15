"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle2, User, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PartnerFormEngine, { type PartnerStep } from "@/components/forms/PartnerFormEngine";
import { type PartnerFormField } from "@/components/forms/FormFieldRenderer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface ApplicationState {
  id: string;
  status: string;
  answers: Record<string, unknown>;
  partner_id: string;
  partner_name: string;
}

type PagePhase = "loading" | "form" | "submitted" | "error";

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
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const localStorageKey = `nubo_draft_${application?.partner_id}_${user!.id}`;

  useEffect(() => {
    // user is guaranteed by AuthGuard in (protected) layout

    const boot = async () => {
      // 1. Fetch Application
      const { data: existingApp, error: appErr } = await supabase
        .from("student_applications")
        .select(`
          id, status, answers, partner_id,
          partner_opportunities:partner_id ( name )
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
      };

      setApplication(appState);

      if (appState.status === "SUBMITTED" || appState.status === "APPROVED") {
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

      if (stepsRes.data) setSteps(stepsRes.data as PartnerStep[]);
      if (fieldsRes.data) setFields(fieldsRes.data as PartnerFormField[]);

      // Initialize selected profile from ProfileContext or application user_id
      setSelectedProfileId(activeProfileId ?? appState.partner_id ?? user!.id);

      setPhase("form");
    };

    boot();
  }, [user, applicationId]);

  // ── Profile change ─────────────────────────────────────────────────────────
  const handleProfileChange = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setActiveProfileId(profileId);
    if (!application) return;
    await supabase
      .from("student_applications")
      .update({ user_id: profileId })
      .eq("id", application.id);
  };

  // ── Draft save ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async (data: Record<string, unknown>) => {
    if (!application) return;
    await supabase.rpc("update_student_application_answers", {
      p_application_id: application.id,
      p_answers: data,
    });
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleSubmitForm = async (data: Record<string, unknown>) => {
    if (!application) return { success: false };

    const { data: result, error } = await supabase.rpc("submit_application_v1", {
      p_application_id: application.id,
      p_answers: data,
    });

    if (error || !result?.success) return { success: false };

    setPhase("submitted");
    return { success: true };
  };

  // ── Merge localStorage draft ───────────────────────────────────────────────
  const defaultValues = (() => {
    const dbAnswers = application?.answers ?? {};
    if (!application) return dbAnswers;
    try {
      const lsDraft = JSON.parse(localStorage.getItem(localStorageKey) ?? "{}");
      return { ...dbAnswers, ...lsDraft };
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
    return (
      <AppShell title="Candidatura enviada">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
          >
            <CheckCircle2 size={32} className="text-green-500" />
          </motion.div>
          <h2 className="text-lg font-bold text-[#024F86] mb-1">Candidatura enviada!</h2>
          <p className="text-xs text-[#3A424E]/60 mb-6">
            Sua candidatura para <strong>{application?.partner_name}</strong> foi registrada e seu match foi atualizado.
          </p>
          <button
            onClick={() => router.push("/candidaturas")}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-xs font-bold shadow"
          >
            Ver minhas candidaturas
          </button>
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
        {profiles.length > 0 && (
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
              partnerName={application.partner_name}
              applicationId={application.id}
              steps={steps}
              fields={fields}
              defaultValues={defaultValues}
              localStorageKey={localStorageKey}
              onSaveDraft={handleSaveDraft}
              onSubmitForm={handleSubmitForm}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
