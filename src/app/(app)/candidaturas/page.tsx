"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ApplicationStepper from "@/components/ApplicationStepper";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ApplicationCard {
  id: string;
  partner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  eligibility_score: number | null;
  opportunity_name: string | null;
  institution_name: string | null;
  logo_url: string | null;
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

const SHOW_STEPPER_FOR: AppStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED"];


export default function CandidaturasPage() {
  const { user, setShowAuthModal } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("student_applications")
      .select(`
        id, partner_id, status, created_at, updated_at, eligibility_score,
        partner_opportunities:partner_id (
          name,
          institutions:institution_id (
            name,
            partner_institutions ( logo_url )
          )
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => {
        const mapped = (data || []).map((row: Record<string, unknown>) => {
          const opp = (row.partner_opportunities as Record<string, unknown> | null) ?? {};
          const inst = (opp.institutions as Record<string, any> | null) ?? {};
          const pi = Array.isArray(inst.partner_institutions)
            ? (inst.partner_institutions[0] || {})
            : (inst.partner_institutions || {});
          return {
            id: row.id as string,
            partner_id: row.partner_id as string,
            status: row.status as string,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            eligibility_score: row.eligibility_score as number | null,
            opportunity_name: (opp.name as string) ?? null,
            institution_name: (inst.name as string) ?? null,
            logo_url: pi.logo_url ?? null,
          };
        });
        setApplications(mapped);
        setLoading(false);
      });
  }, [user]);

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
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3092bb] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
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
          <div className="flex items-center justify-center pt-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 w-full max-w-sm flex flex-col items-center gap-2 text-center">
              <img src="/assets/cloudinha-candidaturas.png" alt="" className="w-[120px] h-[120px]" />
              <p className="text-sm font-semibold text-[#3a424e] mt-1">Nenhuma candidatura por aqui</p>
              <p className="text-xs text-[#707a7e]">Faça login e explore suas oportunidades</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="mt-2 px-6 py-2 rounded-full bg-[#3092bb] text-white text-xs font-semibold shadow"
              >
                Fazer login
              </button>
            </div>
          </div>
        ) : applications.length === 0 ? (
          /* Logged in but no applications */
          <div className="flex items-center justify-center pt-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 w-full max-w-sm flex flex-col items-center gap-2 text-center">
              <img src="/assets/cloudinha-candidaturas.png" alt="" className="w-[120px] h-[120px]" />
              <p className="text-sm font-semibold text-[#3a424e] mt-1">Nenhuma candidatura por aqui</p>
              <p className="text-xs text-[#707a7e]">Explore oportunidades e inicie sua primeira candidatura</p>
              <button
                onClick={() => router.push("/oportunidades")}
                className="mt-2 px-6 py-2 rounded-full bg-[#3092bb] text-white text-xs font-semibold shadow"
              >
                Explorar oportunidades
              </button>
            </div>
          </div>
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
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bgColor} ${cfg.textColor}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-[#707a7e]">Atualizado em {updatedDate}</span>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                  </div>

                  {/* Stepper */}
                  {showStepper && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-50">
                      <ApplicationStepper status={status as "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED"} compact />
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
