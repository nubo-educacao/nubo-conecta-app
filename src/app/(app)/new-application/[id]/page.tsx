"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, ArrowLeft, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PartnerFormEngine, { type PartnerStep } from "@/components/forms/PartnerFormEngine";
import { type PartnerFormField } from "@/components/forms/FormFieldRenderer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerMeta {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ApplicationState {
  id: string;
  status: string;
  answers: Record<string, unknown>;
}

type PagePhase = "loading" | "confirm" | "form" | "submitted" | "error";

export default function NewApplicationPage() {
  const { id: partnerId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, setShowAuthModal } = useAuth();

  const [phase, setPhase] = useState<PagePhase>("loading");
  const [partner, setPartner] = useState<PartnerMeta | null>(null);
  const [steps, setSteps] = useState<PartnerStep[]>([]);
  const [fields, setFields] = useState<PartnerFormField[]>([]);
  const [application, setApplication] = useState<ApplicationState | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  const localStorageKey = `nubo_draft_${partnerId}_${user?.id ?? "anon"}`;

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setPhase("error"); return; }

    const boot = async () => {
      const [partnerRes, stepsRes, fieldsRes, appRes, profileRes] = await Promise.allSettled([
        supabase
          .from("partners")
          .select("id, name, logo_url")
          .eq("id", partnerId)
          .single(),
        supabase
          .from("partner_steps")
          .select("*")
          .eq("partner_id", partnerId)
          .order("sort_order"),
        supabase
          .from("partner_forms")
          .select("*")
          .eq("partner_id", partnerId)
          .order("sort_order"),
        supabase
          .from("student_applications")
          .select("id, status, answers")
          .eq("partner_id", partnerId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_profiles")
          .select("full_name")
          .eq("id", user.id)
          .single(),
      ]);

      if (partnerRes.status === "fulfilled" && partnerRes.value.data) {
        setPartner(partnerRes.value.data as PartnerMeta);
      }
      if (stepsRes.status === "fulfilled") {
        setSteps((stepsRes.value.data as PartnerStep[]) ?? []);
      }
      if (fieldsRes.status === "fulfilled") {
        setFields((fieldsRes.value.data as PartnerFormField[]) ?? []);
      }
      if (profileRes.status === "fulfilled" && profileRes.value.data) {
        setProfileName((profileRes.value.data as { full_name: string }).full_name ?? "");
      }

      const existingApp =
        appRes.status === "fulfilled" ? (appRes.value.data as ApplicationState | null) : null;

      if (existingApp) {
        setApplication(existingApp);
        // Submitted apps → show result screen
        if (existingApp.status === "SUBMITTED" || existingApp.status === "APPROVED") {
          setPhase("submitted");
          return;
        }
        // Draft → go directly to form
        setPhase("form");
      } else {
        // No application yet → show confirmation modal
        setPhase("confirm");
      }
    };

    boot();
  }, [user, partnerId]);

  // ── Create application on confirm ─────────────────────────────────────────
  const handleConfirm = async () => {
    if (!user) return;
    setPhase("loading");

    const { data, error } = await supabase
      .from("student_applications")
      .insert({ user_id: user.id, partner_id: partnerId, status: "DRAFT", answers: {} })
      .select("id, status, answers")
      .single();

    if (error || !data) { setPhase("error"); return; }
    setApplication(data as ApplicationState);
    setPhase("form");
  };

  // ── Draft save (step transition) ───────────────────────────────────────────
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

  // ── Merge localStorage draft into default values ───────────────────────────
  const defaultValues = (() => {
    const dbAnswers = application?.answers ?? {};
    try {
      const lsDraft = JSON.parse(localStorage.getItem(localStorageKey) ?? "{}");
      return { ...dbAnswers, ...lsDraft };
    } catch {
      return dbAnswers;
    }
  })();

  // ── Render phases ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#38B1E4]" />
        </div>
      </AppShell>
    );
  }

  if (phase === "error" || !user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <p className="text-sm font-semibold text-[#024F86] mb-3">
            {!user ? "Faça login para continuar" : "Não foi possível carregar o formulário"}
          </p>
          {!user && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-xs font-bold shadow"
            >
              Entrar
            </button>
          )}
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
            Sua candidatura para <strong>{partner?.name}</strong> foi registrada e seu match foi atualizado.
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

  if (phase === "confirm") {
    return (
      <AppShell title={partner?.name ?? "Nova candidatura"}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pt-6 pb-8"
          >
            {/* Back */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs text-[#3A424E]/60 mb-6 hover:text-[#024F86] transition-colors"
            >
              <ArrowLeft size={14} /> Voltar
            </button>

            {/* Partner card */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#024F86]/10 flex items-center justify-center shrink-0">
                {partner?.logo_url ? (
                  <img src={partner.logo_url} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-[#024F86] font-black text-lg">
                    {partner?.name?.[0] ?? "P"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-base font-bold text-[#024F86]">{partner?.name}</p>
                <p className="text-xs text-[#3A424E]/60">Nova candidatura</p>
              </div>
            </div>

            {/* Profile confirmation */}
            <div className="p-4 rounded-2xl bg-white/60 border border-white/40 backdrop-blur-sm mb-6">
              <p className="text-xs font-bold text-[#024F86] mb-1">Candidatura como</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 rounded-full bg-[#38B1E4]/20 flex items-center justify-center">
                  <User size={14} className="text-[#024F86]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3A424E]">{profileName || user.email}</p>
                  <p className="text-[10px] text-[#3A424E]/50">Perfil principal</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#3A424E]/60 text-center mb-6">
              Você será direcionado ao formulário de candidatura. Suas respostas são salvas automaticamente a cada etapa.
            </p>

            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
            >
              Iniciar candidatura
            </button>
          </motion.div>
        </AnimatePresence>
      </AppShell>
    );
  }

  // phase === "form"
  return (
    <AppShell title={partner?.name ?? "Candidatura"}>
      <div className="h-full flex flex-col">
        <button
          onClick={() => router.push("/candidaturas")}
          className="flex items-center gap-1 text-xs text-[#3A424E]/60 px-4 pt-4 mb-2 hover:text-[#024F86] transition-colors"
        >
          <ArrowLeft size={14} /> Minhas candidaturas
        </button>

        <div className="flex-1 px-4 pb-4">
          {application && (
            <PartnerFormEngine
              partnerName={partner?.name ?? "Parceiro"}
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
