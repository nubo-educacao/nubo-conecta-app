"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ChevronRight, LogIn, Compass } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ApplicationStepper from "@/components/ApplicationStepper";
import { OpportunityPhaseStepper } from "@/components/OpportunityPhaseStepper";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";


interface ApplicationCard {
  id: string;
  partner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  opportunity_name: string | null;
  institution_name: string | null;
  logo_url: string | null;
  phase_id: string | null;
  phase_name: string | null;
  phases: { id: string; name: string; sort_order: number }[];
}

type AppStatus = "DRAFT" | "pending" | "SUBMITTED" | "redirected" | "IN_REVIEW" | "APPROVED" | "REJECTED";

const STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string; iconBg: string; iconText: string }> = {
  DRAFT:      { label: "Rascunho",      bgColor: "bg-gray-100",  textColor: "text-gray-500",     dotColor: "bg-gray-400",    iconBg: "bg-gray-100",   iconText: "text-gray-400" },
  pending:    { label: "Pendente",       bgColor: "bg-gray-50",   textColor: "text-gray-600",     dotColor: "bg-gray-400",    iconBg: "bg-gray-100",   iconText: "text-gray-400" },
  SUBMITTED:  { label: "Enviada",        bgColor: "bg-blue-50",   textColor: "text-blue-600",     dotColor: "bg-blue-500",    iconBg: "bg-blue-100",   iconText: "text-blue-500" },
  redirected: { label: "Redirecionado",  bgColor: "bg-purple-50", textColor: "text-purple-600",   dotColor: "bg-purple-500",  iconBg: "bg-purple-100", iconText: "text-purple-500" },
  IN_REVIEW:  { label: "Em Análise",     bgColor: "bg-amber-50",  textColor: "text-amber-600",    dotColor: "bg-amber-400",   iconBg: "bg-amber-100",  iconText: "text-amber-500" },
  APPROVED:   { label: "Aprovada",       bgColor: "bg-green-50",  textColor: "text-[#25d366]",    dotColor: "bg-[#25d366]",   iconBg: "bg-green-100",  iconText: "text-[#25d366]" },
  REJECTED:   { label: "Reprovada",      bgColor: "bg-red-50",    textColor: "text-red-600",      dotColor: "bg-red-500",     iconBg: "bg-red-100",    iconText: "text-red-500" },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.28, ease: "easeOut" as const },
  }),
};

const SHOW_STEPPER_FOR: AppStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "redirected"];


export default function CandidaturasPage() {
  const { user, setShowAuthModal } = useAuth();
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const profileId = activeProfileId || user.id;

    supabase
      .from("student_applications")
      .select(`
        id, partner_id, status, created_at, updated_at, phase_id,
        opportunity_phases:phase_id ( name ),
        partner_opportunities:partner_id (
          name,
          institutions:institution_id (
            name,
            partner_institutions ( logo_url )
          ),
          opportunity_phases (id, name, sort_order)
        )
      `)
      .eq("user_id", profileId)
      .order("updated_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => {
        const mapped = (data || []).map((row: Record<string, unknown>) => {
          const opp = (row.partner_opportunities as Record<string, unknown> | null) ?? {};
          const inst = (opp.institutions as Record<string, any> | null) ?? {};
          const pi = Array.isArray(inst.partner_institutions)
            ? (inst.partner_institutions[0] || {})
            : (inst.partner_institutions || {});
          const opPhase = (row.opportunity_phases as Record<string, unknown> | null) ?? {};
          return {
            id: row.id as string,
            partner_id: row.partner_id as string,
            status: row.status as string,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            opportunity_name: (opp.name as string) ?? null,
            institution_name: (inst.name as string) ?? null,
            logo_url: pi.logo_url ?? null,
            phase_id: (row.phase_id as string) ?? null,
            phase_name: (opPhase.name as string) ?? null,
            phases: Array.isArray(opp.opportunity_phases) ? (opp.opportunity_phases as any) : [],
          };
        });
        setApplications(mapped);
        setLoading(false);
      });
  }, [user, activeProfileId]);

  const handleCardClick = (app: ApplicationCard) => {
    router.push(`/partner-forms/${app.id}`);
  };

  return (
    <AppShell title="Candidaturas">
      <div className="px-4 pt-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#3a424e]">Candidaturas</h1>
            <p className="text-[13px] text-[#636e7c] mt-0.5">Acompanhe suas inscrições</p>
          </div>
          <button
            onClick={() => router.push("/oportunidades")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#38B1E4] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={14} /> Nova
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[100px] rounded-2xl bg-white/50 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : !user ? (
          /* Not logged in empty state */
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center justify-center pt-4"
          >
            <div className="relative w-full max-w-sm bg-white/80 backdrop-blur-md border border-gray-100/80 rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.03)] p-8 flex flex-col items-center text-center overflow-hidden">
              {/* Soft decorative background glow */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#38B1E4]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-[#38B1E4]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Cloudinha Container with floating animation */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#38B1E4]/10 rounded-full scale-110 blur-md animate-pulse" />
                
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="relative z-10 w-28 h-28 flex items-center justify-center bg-gradient-to-b from-white to-[#f0f8fc] rounded-full border border-[#d2ebf5]/50 shadow-[0_8px_16px_rgba(0,0,0,0.04)]"
                >
                  <img 
                    src="/assets/cloudinha-candidaturas.png" 
                    alt="Cloudinha" 
                    className="w-[88px] h-[88px] object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.04)]" 
                  />
                </motion.div>
              </div>

              {/* Text info */}
              <h3 className="text-base font-bold text-[#3a424e] mb-1.5 relative z-10">
                Nenhuma candidatura por aqui
              </h3>
              <p className="text-xs text-[#707a7e] leading-relaxed mb-6 max-w-[240px] relative z-10">
                Faça login e explore suas oportunidades
              </p>

              {/* Decorative Guide steps to make it look premium */}
              <div className="w-full border-t border-gray-100/80 pt-5 mb-5 flex flex-col gap-2.5 text-left relative z-10">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#e6f4f9] text-[#38B1E4] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[11px] text-[#556066] leading-snug">
                    <span className="font-semibold text-[#3a424e]">Faça login</span> para acessar seu perfil e histórico de inscrições.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#f8f9fa] text-gray-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[11px] text-[#707a7e] leading-snug">
                    <span className="font-semibold text-gray-500">Escolha um edital</span> ou curso parceiro no catálogo de vagas.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-full bg-gradient-to-r from-[#38B1E4] to-[#247c9f] hover:from-[#359fcb] hover:to-[#2a8bb3] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 relative z-10"
              >
                <LogIn size={13} />
                Fazer login
              </motion.button>
            </div>
          </motion.div>
        ) : applications.length === 0 ? (
          /* Logged in but no applications */
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center justify-center pt-4"
          >
            <div className="relative w-full max-w-sm bg-white/80 backdrop-blur-md border border-gray-100/80 rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.03)] p-8 flex flex-col items-center text-center overflow-hidden">
              {/* Soft decorative background glow */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#38B1E4]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-[#38B1E4]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Cloudinha Container with floating animation */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#38B1E4]/10 rounded-full scale-110 blur-md animate-pulse" />
                
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="relative z-10 w-28 h-28 flex items-center justify-center bg-gradient-to-b from-white to-[#f0f8fc] rounded-full border border-[#d2ebf5]/50 shadow-[0_8px_16px_rgba(0,0,0,0.04)]"
                >
                  <img 
                    src="/assets/cloudinha-candidaturas.png" 
                    alt="Cloudinha" 
                    className="w-[88px] h-[88px] object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.04)]" 
                  />
                </motion.div>
              </div>

              {/* Text info */}
              <h3 className="text-base font-bold text-[#3a424e] mb-1.5 relative z-10">
                Nenhuma candidatura por aqui
              </h3>
              <p className="text-xs text-[#707a7e] leading-relaxed mb-6 max-w-[240px] relative z-10">
                Explore oportunidades e inicie sua primeira candidatura
              </p>

              {/* Decorative Guide steps to make it look premium */}
              <div className="w-full border-t border-gray-100/80 pt-5 mb-5 flex flex-col gap-2.5 text-left relative z-10">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#e6f4f9] text-[#38B1E4] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[11px] text-[#556066] leading-snug">
                    <span className="font-semibold text-[#3a424e]">Escolha uma vaga</span> no catálogo de oportunidades ativas.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#e6f4f9] text-[#38B1E4] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[11px] text-[#556066] leading-snug">
                    <span className="font-semibold text-[#3a424e]">Preencha o formulário</span> guiado pela Cloudinha de forma simples.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/oportunidades")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-full bg-gradient-to-r from-[#38B1E4] to-[#247c9f] hover:from-[#359fcb] hover:to-[#2a8bb3] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 relative z-10"
              >
                <Compass size={13} />
                Explorar oportunidades
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Application list */
          <div className="space-y-3">
            {applications.map((app, i) => {
              const status = (app.status || "DRAFT") as AppStatus;
              const cfg = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
              const showStepper = SHOW_STEPPER_FOR.includes(status);

              const updatedDate = new Date(app.updated_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              return (
                <motion.button
                  key={app.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => handleCardClick(app)}
                  className="w-full text-left bg-white border border-[#f9fafb] rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                      {app.logo_url ? (
                        <img src={app.logo_url} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <span className={`text-lg font-black ${cfg.iconText}`}>
                          {(app.opportunity_name ?? "P")[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#3a424e] truncate">
                        {app.opportunity_name ?? "Programa parceiro"}
                      </p>
                      {app.institution_name && (
                        <p className="text-[12px] text-[#636e7c] truncate">{app.institution_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bgColor} ${cfg.textColor}`}>
                          {cfg.label}
                        </span>
                        {app.phase_name && status !== "redirected" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eaeaff] text-[#635bff]">
                            Fase: {app.phase_name}
                          </span>
                        )}
                        <span className="text-[10px] text-[#707a7e]">Atualizado em {updatedDate}</span>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                  </div>

                  {/* Stepper */}
                  {showStepper && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-50">
                      {app.phases && app.phases.length > 0 ? (
                        <OpportunityPhaseStepper 
                          phases={app.phases} 
                          currentPhaseId={app.phase_id} 
                          initialStepLabel={status === "redirected" ? "Estudante Redirecionado" : "Candidatura Enviada"}
                        />
                      ) : (
                        <ApplicationStepper status={status as "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED"} compact />
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
