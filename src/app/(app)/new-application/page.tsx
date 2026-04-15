"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

import type { IUnifiedOpportunity } from "@/types/opportunities";
import CardOportunidadeParceira from "@/components/opportunities/CardOportunidadeParceira";

interface OpportunityWithApplied extends IUnifiedOpportunity {
  has_applied: boolean;
}


export default function NewApplicationListPage() {
  const { user, setShowAuthModal } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityWithApplied[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      // Fetch approved partner_opportunities that have at least one partner_step
      // (i.e., use the internal form engine, not external redirect)
      const { data: opps } = await supabase
        .from("partner_opportunities")
        .select(`
          id, name, opportunity_type, description, created_at,
          institutions:institution_id ( name, partner_institutions(logo_url, description, location) ),
          partner_steps ( id )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!opps) { setLoading(false); return; }

      // Filter to those with at least one step (internal form)
      const withForms = opps.filter(
        (o: Record<string, unknown>) =>
          Array.isArray(o.partner_steps) && (o.partner_steps as unknown[]).length > 0,
      );

      // If user is logged in, check which ones they've already applied to
      let appliedIds = new Set<string>();
      if (user) {
        const { data: apps } = await supabase
          .from("student_applications")
          .select("partner_id")
          .eq("user_id", user.id);
        appliedIds = new Set((apps ?? []).map((a: { partner_id: string }) => a.partner_id));
      }

      setOpportunities(
        withForms.map((o: Record<string, unknown>) => {
          const inst = (o.institutions as Record<string, any>) ?? {};
          let pi: Record<string, any> = {};
          if (Array.isArray(inst.partner_institutions) && inst.partner_institutions.length > 0) {
              pi = inst.partner_institutions[0];
          } else if (inst.partner_institutions && !Array.isArray(inst.partner_institutions)) {
              pi = inst.partner_institutions;
          }
          return {
            id:               o.id as string,
            title:            o.name as string,
            institution_name: inst.name ?? "Instituição Parceira",
            category_label:   "Programas Educacionais",
            category:         "educational_programs",
            is_partner:       true,
            type:             "partner",
            opportunity_type: o.opportunity_type as string,
            location:         pi.location ?? "Nacional",
            education_level:  "Programa",
            badges:           [],
            created_at:       o.created_at as string,
            has_applied:      appliedIds.has(o.id as string),
          };
        }),
      );
      setLoading(false);
    };

    fetchOpportunities();
  }, [user]);

  const handleSelect = (oppId: string) => {
    if (!user) { setShowAuthModal(true); return; }
    router.push(`/new-application/${oppId}`);
  };

  return (
    <AppShell title="Nova candidatura">
      <div className="px-4 pt-6 pb-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-[#3A424E]/60 mb-4 hover:text-[#024F86] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-xl font-bold text-[#024F86]">Escolha um programa</h1>
          <p className="text-xs text-[#3A424E]/60 mt-0.5">
            Selecione uma oportunidade para iniciar sua candidatura
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#38B1E4]" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-[#024F86]/30 mb-3" />
            <p className="text-sm font-semibold text-[#024F86]">Nenhum programa disponível</p>
            <p className="text-xs text-[#3A424E]/60 mt-1">
              Novos programas são adicionados regularmente. Volte em breve.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp) => (
              <div key={opp.id} className="relative">
                <CardOportunidadeParceira
                  opportunity={opp}
                  onClickOverride={handleSelect}
                />
                {opp.has_applied && (
                  <div className="absolute top-2 right-4 z-40">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
                      Já candidatado
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
