"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, User, Users, MapPin, Clock } from "lucide-react";
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

// Skeleton placeholder for cards
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white animate-pulse">
      <div className="h-28 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCandidaturaPage() {
  const { id: partnerOppId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: nullableUser } = useAuth();
  const user = nullableUser!; // guaranteed by AuthGuard in (protected) layout

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerMeta | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [similarOpps, setSimilarOpps] = useState<IUnifiedOpportunity[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // user is guaranteed by AuthGuard in (protected) layout

    const boot = async () => {
      try {
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
          const mainProfile = (profilesRes.data as UserProfile[]).find(p => p.id === user.id);
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
          .limit(4);

        if (similarRes.data) {
          const mapped = similarRes.data
            .filter((o: Record<string, unknown>) => Array.isArray(o.partner_steps) && (o.partner_steps as unknown[]).length > 0)
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
      } catch {
        setError("Não foi possível carregar os dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [user, partnerOppId]);

  const handleConfirm = async () => {
    if (!partner) return;
    setCreating(true);
    setError(null);

    const { data, error: insertErr } = await supabase
      .from("student_applications")
      .insert({
        user_id: selectedProfileId,
        partner_id: partnerOppId,
        status: "DRAFT",
        answers: {}
      })
      .select("id")
      .single();

    if (insertErr || !data) {
      setError("Erro ao iniciar candidatura. Tente novamente.");
      setCreating(false);
      return;
    }

    router.push(`/partner-forms/${data.id}`);
  };

  // user is guaranteed by AuthGuard in (protected) layout

  const mainProfile = profiles.find(p => p.id === user.id);
  const dependents = profiles.filter(p => p.isdependent);
  const oppTypeLabel = partner?.opportunity_type
    ? partner.opportunity_type.charAt(0).toUpperCase() + partner.opportunity_type.slice(1)
    : "Programa";

  return (
    <AppShell title="Nova Candidatura">
      <div className="pb-32">
        {/* Back + heading */}
        <div className="px-4 pt-4 mb-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> Voltar
          </button>
          <h1 className="text-[18px] font-bold text-[#3a424e]">Nova Candidatura</h1>
          <p className="text-xs text-[#636e7c]">Revisão e confirmação</p>
        </div>

        <div className="px-4 space-y-6">

          {/* SECTION 1: Titularidade */}
          <section>
            <h2 className="text-[14px] font-bold text-[#3a424e] mb-1">1. Titularidade</h2>
            <p className="text-xs text-[#636e7c] mb-3">Para quem é esta candidatura?</p>

            <div className="flex gap-3">
              {/* Para mim */}
              <button
                onClick={() => setSelectedProfileId(user.id)}
                className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-[1.1px] text-left transition-all ${
                  selectedProfileId === user.id
                    ? "border-[#38B1E4] bg-[rgba(56,177,228,0.05)]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  selectedProfileId === user.id ? "bg-[#38B1E4]" : "bg-gray-100"
                }`}>
                  <User size={18} className={selectedProfileId === user.id ? "text-white" : "text-gray-400"} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] font-bold truncate ${
                    selectedProfileId === user.id ? "text-[#38B1E4]" : "text-[#3a424e]"
                  }`}>
                    Para mim
                  </p>
                  <p className="text-[10px] text-[#707a7e] truncate">
                    {mainProfile?.full_name || user.email}
                  </p>
                </div>
              </button>

              {/* Dependente */}
              <div className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-[1.1px] text-left transition-all ${
                selectedProfileId !== user.id && selectedProfileId !== ""
                  ? "border-[#38B1E4] bg-[rgba(56,177,228,0.05)]"
                  : "border-gray-200"
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  selectedProfileId !== user.id && selectedProfileId !== ""
                    ? "bg-[#38B1E4]"
                    : "bg-gray-100"
                }`}>
                  <Users size={18} className={
                    selectedProfileId !== user.id && selectedProfileId !== "" ? "text-white" : "text-gray-400"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold ${
                    selectedProfileId !== user.id && selectedProfileId !== ""
                      ? "text-[#38B1E4]"
                      : "text-[#3a424e]"
                  }`}>
                    Dependente
                  </p>
                  {dependents.length > 0 ? (
                    <select
                      className="w-full bg-transparent text-[10px] text-[#707a7e] outline-none mt-0.5"
                      value={selectedProfileId === user.id ? "" : selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                    >
                      <option value="" disabled>Selecionar...</option>
                      {dependents.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[10px] text-[#707a7e]">Selecionar...</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Resumo da Vaga */}
          <section>
            <h2 className="text-[14px] font-bold text-[#3a424e] mb-3">2. Resumo da Vaga</h2>

            {loading ? (
              <CardSkeleton />
            ) : partner ? (
              <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
                {/* Cover */}
                <div
                  className="h-28 w-full relative"
                  style={{
                    backgroundColor: "#024F86",
                    backgroundImage: partner.cover_url ? `url(${partner.cover_url})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-2.5 right-3 bg-[#FF9900] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Parceiro
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 bg-white shadow-sm overflow-hidden -mt-8">
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[#024F86] font-black text-xl">
                          {partner.name[0]}
                        </span>
                      )}
                    </div>

                    <div className="pt-1 flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-[#3a424e] leading-tight truncate">
                        {partner.name}
                      </h3>
                      <p className="text-[12px] text-[#636e7c] mb-2">{partner.institution_name}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        {partner.location && (
                          <span className="flex items-center gap-1 text-[11px] text-[#707a7e]">
                            <MapPin size={11} /> {partner.location}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-gray-200 text-[#3a424e] bg-gray-50">
                          {oppTypeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-sm text-red-600">Não foi possível carregar os dados da vaga.</p>
              </div>
            )}
          </section>

          {/* SECTION 3: Outras Oportunidades */}
          {(loading || similarOpps.length > 0) && (
            <section>
              <h2 className="text-[14px] font-bold text-[#3a424e] mb-1">3. Outras Oportunidades para Você</h2>
              <p className="text-xs text-[#636e7c] mb-3">Vagas similares ordenadas pelo seu match</p>

              {loading ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[1, 2].map(i => (
                    <div key={i} className="min-w-[220px] w-[220px] h-[146px] rounded-2xl bg-gray-100 animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-3 pb-3 snap-x -mx-4 px-4">
                  {similarOpps.map(opp => (
                    <div key={opp.id} className="min-w-[220px] w-[220px] snap-center shrink-0">
                      <OpportunityCard
                        opportunity={opp}
                        onClickOverride={(id) => router.push(`/new-application/${id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 pointer-events-none">
        <div className="max-w-[600px] mx-auto pointer-events-auto">
          <button
            onClick={handleConfirm}
            disabled={creating || !selectedProfileId || loading}
            className="w-full flex justify-center items-center py-4 rounded-full bg-[#024F86] text-white text-[15px] font-bold shadow-[0px_10px_7.5px_rgba(0,0,0,0.1)] hover:bg-[#023E6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 size={22} className="animate-spin" /> : "Confirmar Candidatura"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
