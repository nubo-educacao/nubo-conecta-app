"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, User, Users, MapPin } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import type { IUnifiedOpportunity } from "@/types/opportunities";

interface PartnerMeta {
  id: string;
  name: string;
  opportunity_type: string;
  institution_name: string;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  isdependent: boolean;
}

export default function CheckoutCandidaturaPage() {
  const { id: partnerOppId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, setShowAuthModal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerMeta | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [similarOpps, setSimilarOpps] = useState<IUnifiedOpportunity[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const boot = async () => {
      // 1. Fetch current opportunity
      const oppRes = await supabase
        .from("partner_opportunities")
        .select(`
          id, name, opportunity_type,
          institutions:institution_id ( 
            name,
            partner_institutions ( logo_url, cover_url, location )
          )
        `)
        .eq("id", partnerOppId)
        .single();

      if (oppRes.data) {
        const o = oppRes.data as Record<string, unknown>;
        const inst = (o.institutions as Record<string, any>) ?? {};
        let pi: Record<string, string | null> = {};
        if (Array.isArray(inst.partner_institutions) && inst.partner_institutions.length > 0) {
            pi = inst.partner_institutions[0];
        } else if (inst.partner_institutions && !Array.isArray(inst.partner_institutions)) {
            pi = inst.partner_institutions;
        }
        setPartner({
          id: o.id as string,
          name: o.name as string,
          opportunity_type: o.opportunity_type as string,
          institution_name: inst.name ?? "Instituição Parceira",
          logo_url: pi.logo_url ?? null,
          cover_url: pi.cover_url ?? null,
          location: pi.location ?? "Nacional",
        });
      }

      // 2. Fetch User & Dependents
      const profilesRes = await supabase
        .from("user_profiles")
        .select("id, full_name, isdependent, parent_user_id")
        .or(`id.eq.${user.id},parent_user_id.eq.${user.id}`);

      if (profilesRes.data) {
        setProfiles(profilesRes.data as UserProfile[]);
        const mainProfile = profilesRes.data.find(p => p.id === user.id);
        if (mainProfile) setSelectedProfileId(mainProfile.id);
      }

      // 3. Fetch similar opportunities
      const similarRes = await supabase
        .from("partner_opportunities")
        .select(`
          id, name, opportunity_type, created_at,
          institutions:institution_id ( 
            name,
            partner_institutions ( logo_url, location )
          ),
          partner_steps ( id )
        `)
        .eq("status", "approved")
        .neq("id", partnerOppId)
        .limit(3);

      if (similarRes.data) {
        const mapped = similarRes.data
          .filter((o: Record<string, unknown>) => Array.isArray(o.partner_steps) && o.partner_steps.length > 0)
          .map((o: Record<string, unknown>) => {
            const inst = (o.institutions as Record<string, any>) ?? {};
            let pi: Record<string, string | null> = {};
            if (Array.isArray(inst.partner_institutions) && inst.partner_institutions.length > 0) {
                pi = inst.partner_institutions[0];
            } else if (inst.partner_institutions && !Array.isArray(inst.partner_institutions)) {
                pi = inst.partner_institutions;
            }
            return {
              id: o.id as string,
              title: o.name as string,
              institution_name: inst.name ?? "Instituição Parceira",
              category_label: "Programas Educacionais",
              category: "educational_programs",
              is_partner: true,
              type: "partner",
              opportunity_type: o.opportunity_type as string,
              location: pi.location ?? "Nacional",
              education_level: "Programa",
              badges: [],
              created_at: o.created_at as string,
            } as IUnifiedOpportunity;
          });
        setSimilarOpps(mapped);
      }

      setLoading(false);
    };

    boot();
  }, [user, partnerOppId]);

  const handleConfirm = async () => {
    if (!user || !partner) return;
    setCreating(true);

    // Creates the draft application for the selected profile (could be dependent)
    // NOTE: If using dependent, we set user_id to the selected profile ID.
    const { data, error } = await supabase
      .from("student_applications")
      .insert({ 
        user_id: selectedProfileId, 
        partner_id: partnerOppId, 
        status: "DRAFT", 
        answers: {} 
      })
      .select("id")
      .single();

    if (error || !data) {
      alert("Erro ao iniciar candidatura. Tente novamente.");
      setCreating(false);
      return;
    }

    router.push(`/partner-forms/${data.id}`);
  };

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <p className="text-sm font-semibold text-[#024F86] mb-3">Faça login para continuar</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2.5 rounded-full bg-[#024F86] text-white text-xs font-bold"
          >
            Entrar
          </button>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#38B1E4]" />
        </div>
      </AppShell>
    );
  }

  const mainProfile = profiles.find(p => p.id === user.id);
  const dependents = profiles.filter(p => p.isdependent);

  // Helper for capitalization
  const oppTypeLabel = partner?.opportunity_type 
    ? partner.opportunity_type.charAt(0).toUpperCase() + partner.opportunity_type.slice(1)
    : "Programa";

  return (
    <AppShell title="Nova Candidatura">
      <div className="pb-24">
        {/* Header Title */}
        <div className="px-6 pt-6 mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 className="text-2xl font-bold text-[#024F86]">Nova Candidatura</h1>
          <p className="text-sm text-gray-500">Revisão e confirmação</p>
        </div>

        <div className="px-6 space-y-8">
          
          {/* SECTION 1: Titularidade */}
          <section>
            <h2 className="text-md font-bold text-gray-800 mb-3">1. Titularidade</h2>
            <p className="text-xs text-gray-500 mb-4">Para quem é esta candidatura?</p>
            <div className="flex flex-col md:flex-row gap-4">
              
              <button
                onClick={() => setSelectedProfileId(user.id)}
                className={`flex-1 flex items-center p-4 rounded-xl border-2 text-left transition-all ${
                  selectedProfileId === user.id 
                    ? "border-[#38B1E4] bg-blue-50/50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${
                  selectedProfileId === user.id ? "bg-[#38B1E4]/20 text-[#024F86]" : "bg-gray-100 text-gray-400"
                }`}>
                  <User size={20} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${selectedProfileId === user.id ? "text-[#024F86]" : "text-gray-700"}`}>
                    Para mim
                  </p>
                  <p className="text-xs text-gray-500 truncate">{mainProfile?.full_name || user.email}</p>
                </div>
              </button>

              <div className={`flex-1 flex items-center p-4 rounded-xl border-2 text-left transition-all ${
                  selectedProfileId !== user.id && selectedProfileId !== ""
                    ? "border-[#38B1E4] bg-blue-50/50" 
                    : "border-gray-200"
                }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${
                  selectedProfileId !== user.id && selectedProfileId !== "" ? "bg-[#38B1E4]/20 text-[#024F86]" : "bg-gray-100 text-gray-400"
                }`}>
                  <Users size={20} />
                </div>
                <div className="flex-1 w-full min-w-0">
                  <p className={`text-sm font-bold ${selectedProfileId !== user.id && selectedProfileId !== "" ? "text-[#024F86]" : "text-gray-700"}`}>
                    Dependente
                  </p>
                  {dependents.length > 0 ? (
                    <select 
                      className="w-full bg-transparent text-xs text-gray-600 outline-none mt-1"
                      value={selectedProfileId === user.id ? "" : selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                    >
                      <option value="" disabled>Selecionar...</option>
                      {dependents.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Nenhum dependente</p>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 2: Resumo da Vaga */}
          {partner && (
            <section>
              <h2 className="text-md font-bold text-gray-800 mb-4">2. Resumo da Vaga</h2>
              
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                {/* Cover Area */}
                <div 
                  className="h-28 w-full relative"
                  style={{ 
                    backgroundColor: "#024F86", 
                    backgroundImage: partner.cover_url ? `url(${partner.cover_url})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                >
                  <div className="absolute top-3 right-3 bg-[#FF9900] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Parceiro
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full border border-gray-100 p-1 flex items-center justify-center shrink-0 bg-white -mt-10 overflow-hidden shadow-sm">
                     {partner.logo_url ? (
                        <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
                     ) : (
                        <span className="text-[#024F86] font-black text-xl">{partner.name[0]}</span>
                     )}
                  </div>

                  <div className="pt-1">
                    <h3 className="text-lg font-bold text-[#3A424E] leading-tight mb-1">{partner.name}</h3>
                    <p className="text-sm font-medium text-gray-500 mb-3">{partner.institution_name}</p>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="flex items-center gap-1 text-[12px] text-gray-500">
                        <MapPin size={12} /> {partner.location}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 text-gray-600 bg-gray-50">
                        {oppTypeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: Outras Oportunidades */}
          {similarOpps.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-md font-bold text-gray-800">3. Outras Oportunidades para Você</h2>
                <p className="text-xs text-gray-500">Vagas similares ordenadas pelo seu match</p>
              </div>
              
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                {similarOpps.map(opp => (
                  <div key={opp.id} className="min-w-[280px] w-[280px] snap-center">
                    <OpportunityCard 
                      opportunity={opp} 
                      onClickOverride={(id) => router.push(`/new-application/${id}`)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Confirm Area */}
          <div className="pt-4 pb-10">
            <button
              onClick={handleConfirm}
              disabled={creating || !selectedProfileId}
              className="w-full flex justify-center items-center py-4 rounded-full bg-[#024F86] text-white text-md font-bold shadow-lg hover:shadow-xl hover:bg-[#023E6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 size={24} className="animate-spin" /> : "Confirmar Candidatura"}
            </button>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
