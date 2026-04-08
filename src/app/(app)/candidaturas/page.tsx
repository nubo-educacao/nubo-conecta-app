"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, XCircle, ArrowRight, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ApplicationCard {
  id: string;
  partner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  eligibility_score: number | null;
  partner_name: string | null;
  partner_logo_url: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: "Rascunho",
    color: "border-amber-300 bg-amber-50 text-amber-700",
    icon: <Clock size={14} />,
  },
  SUBMITTED: {
    label: "Enviada",
    color: "border-blue-300 bg-blue-50 text-blue-700",
    icon: <CheckCircle2 size={14} />,
  },
  APPROVED: {
    label: "Aprovada",
    color: "border-green-300 bg-green-50 text-green-700",
    icon: <CheckCircle2 size={14} />,
  },
  REJECTED: {
    label: "Rejeitada",
    color: "border-red-300 bg-red-50 text-red-700",
    icon: <XCircle size={14} />,
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.3, ease: "easeOut" as const },
  }),
};

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
        partners:partner_id ( name, logo_url )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        const mapped = (data || []).map((row: Record<string, unknown>) => {
          const partner = (row.partners as Record<string, string> | null) ?? {};
          return {
            id: row.id as string,
            partner_id: row.partner_id as string,
            status: row.status as string,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            eligibility_score: row.eligibility_score as number | null,
            partner_name: partner.name ?? null,
            partner_logo_url: partner.logo_url ?? null,
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
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#024F86]">Candidaturas</h1>
            <p className="text-xs text-[#3A424E]/60 mt-0.5">
              {applications.length > 0
                ? `${applications.length} candidatura${applications.length > 1 ? "s" : ""}`
                : "Nenhuma candidatura ainda"}
            </p>
          </div>
          <button
            onClick={() => router.push("/oportunidades")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={14} /> Nova
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/40 animate-pulse" />
            ))}
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-[#024F86]/30 mb-3" />
            <p className="text-sm font-semibold text-[#024F86]">Entre para ver suas candidaturas</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-xs font-bold shadow"
            >
              Entrar
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-[#024F86]/30 mb-3" />
            <p className="text-sm font-semibold text-[#024F86]">Nenhuma candidatura ainda</p>
            <p className="text-xs text-[#3A424E]/60 mt-1">Explore oportunidades e inicie sua primeira candidatura</p>
            <button
              onClick={() => router.push("/oportunidades")}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#024F86] to-[#38B1E4] text-white text-xs font-bold shadow"
            >
              Explorar oportunidades
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app, i) => {
              const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DRAFT;
              const updatedDate = new Date(app.updated_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              });

              return (
                <motion.button
                  key={app.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => handleCardClick(app)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm hover:shadow-md hover:bg-white/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#024F86]/10 flex items-center justify-center shrink-0">
                    {app.partner_logo_url ? (
                      <img src={app.partner_logo_url} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <FileText size={18} className="text-[#024F86]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#024F86] truncate">
                      {app.partner_name ?? "Parceiro"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      <span className="text-[10px] text-[#3A424E]/50">{updatedDate}</span>
                      {app.eligibility_score != null && (
                        <span className="text-[10px] font-bold text-[#38B1E4]">
                          {app.eligibility_score.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    size={16}
                    className="text-[#3A424E]/30 group-hover:text-[#38B1E4] transition-colors shrink-0"
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
