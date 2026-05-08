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

type AppStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
  DRAFT: {
    label: "Rascunho",
    bgColor: "bg-gray-100",
    textColor: "text-gray-500",
    dotColor: "bg-gray-400",
  },
  SUBMITTED: {
    label: "Enviada",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    dotColor: "bg-blue-500",
  },
  IN_REVIEW: {
    label: "Em Análise",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
    dotColor: "bg-amber-400",
  },
  APPROVED: {
    label: "Aprovada",
    bgColor: "bg-green-50",
    textColor: "text-[#25d366]",
    dotColor: "bg-[#25d366]",
  },
  REJECTED: {
    label: "Reprovada",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    dotColor: "bg-red-500",
  },
};

const STATUS_ICON_BG: Record<string, string> = {
  DRAFT: "bg-gray-100",
  SUBMITTED: "bg-blue-100",
  IN_REVIEW: "bg-amber-100",
  APPROVED: "bg-green-100",
  REJECTED: "bg-red-100",
};

const STATUS_ICON_TEXT: Record<string, string> = {
  DRAFT: "text-gray-400",
  SUBMITTED: "text-blue-500",
  IN_REVIEW: "text-amber-500",
  APPROVED: "text-[#25d366]",
  REJECTED: "text-red-500",
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

// Simple Cloudinha SVG illustration
function CloudinhaIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="rgba(48,146,187,0.08)" />
      <ellipse cx="32" cy="30" rx="18" ry="14" fill="#38B1E4" />
      <ellipse cx="20" cy="34" rx="8" ry="6" fill="#38B1E4" />
      <ellipse cx="44" cy="34" rx="8" ry="6" fill="#38B1E4" />
      <ellipse cx="32" cy="26" rx="12" ry="10" fill="#5AC8F0" />
      {/* eyes */}
      <circle cx="28" cy="25" r="2.5" fill="white" />
      <circle cx="36" cy="25" r="2.5" fill="white" />
      <circle cx="28.8" cy="25.8" r="1.2" fill="#024F86" />
      <circle cx="36.8" cy="25.8" r="1.2" fill="#024F86" />
      {/* smile */}
      <path d="M28 30 Q32 33 36 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* body legs */}
      <rect x="26" y="42" width="5" height="8" rx="2.5" fill="#024F86" />
      <rect x="33" y="42" width="5" height="8" rx="2.5" fill="#024F86" />
      {/* body */}
      <rect x="22" y="38" width="20" height="10" rx="5" fill="#024F86" />
      {/* star badge */}
      <circle cx="48" cy="14" r="6" fill="#FFD700" />
      <text x="45.5" y="18" fontSize="8" fill="#024F86" fontWeight="bold">★</text>
    </svg>
  );
}

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
          institutions:institution_id ( name ),
          partner_institutions:institution_id ( logo_url )
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        const mapped = (data || []).map((row: Record<string, unknown>) => {
          const opp = (row.partner_opportunities as Record<string, unknown> | null) ?? {};
          const inst = (opp.institutions as Record<string, string> | null) ?? {};
          const pi  = (opp.partner_institutions as Record<string, string> | null) ?? {};
          return {
            id:               row.id as string,
            partner_id:       row.partner_id as string,
            status:           row.status as string,
            created_at:       row.created_at as string,
            updated_at:       row.updated_at as string,
            eligibility_score: row.eligibility_score as number | null,
            opportunity_name: (opp.name as string) ?? null,
            institution_name: (inst.name as string) ?? null,
            logo_url:         pi.logo_url ?? null,
          };
        });
        setApplications(mapped);
        setLoading(false);
      });
  }, [user]);

  const handleCardClick = (app: ApplicationCard) => {
    router.push(`/new-application/${app.partner_id}`);
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
            onClick={() => router.push("/new-application")}
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
              <CloudinhaIllustration />
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
              <CloudinhaIllustration />
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
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
              const iconBg = STATUS_ICON_BG[status] ?? STATUS_ICON_BG.DRAFT;
              const iconText = STATUS_ICON_TEXT[status] ?? STATUS_ICON_TEXT.DRAFT;
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
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                      {app.logo_url ? (
                        <img src={app.logo_url} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <span className={`text-lg font-black ${iconText}`}>
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
                      <ApplicationStepper status={status} compact />
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
