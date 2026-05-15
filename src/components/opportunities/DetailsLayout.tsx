'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Share2, Heart, ExternalLink, Info, MapPin,
  Globe, GraduationCap, Award, Users, Clock, Calendar,
  CheckCircle2, Building2, Sun, Sunset, Moon, SunMoon, Laptop,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import SisuProuniCard from './SisuProuniCard';
import OpportunitiesListCard, { Opportunity } from './OpportunitiesListCard';
import SisuScoreDisplay from './SisuScoreDisplay';
import OpportunityCard from './OpportunityCard';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { createApplication } from '@/app/(app)/oportunidades/[id]/actions';

type SisuVacancyRow = Record<string, unknown>;
type ProuniVacancyRow = Record<string, unknown>;
type ApprovalRow = Record<string, unknown>;

type VacancyDetails =
  | { type: 'sisu'; rows: SisuVacancyRow[] }
  | { type: 'prouni'; rows: ProuniVacancyRow[] }
  | null;

interface DetailsLayoutProps {
  opportunity: IUnifiedOpportunity;
  relatedOpportunities?: Opportunity[];
  isFavorited?: boolean;
  onFavorite?: () => void;
  approvalStats?: ApprovalRow[] | null;
}

export default function DetailsLayout({
  opportunity,
  relatedOpportunities = [],
  isFavorited,
  onFavorite,
  approvalStats,
}: DetailsLayoutProps) {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [isRegistrationOpen, setIsRegistrationOpen] = React.useState<boolean | null>(null);
  const [registrationDates, setRegistrationDates] = React.useState<{ start: string; end: string } | null>(null);
  const [campus, setCampus] = React.useState<{ name: string; city: string; state: string } | null>(null);
  const [applying, setApplying] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [similarOpps, setSimilarOpps] = React.useState<IUnifiedOpportunity[]>([]);

  const isPartner = opportunity.is_partner;
  const brandColor = opportunity.brand_color || (isPartner ? '#7030C2' : '#3092BB');

  const isEncerrado = opportunity.status === 'inactive';

  React.useEffect(() => {
    if (isPartner) {
      setIsRegistrationOpen(true);
      return;
    }

    const checkDates = async () => {
      const { data } = await supabase
        .from('important_dates')
        .select('start_date, end_date')
        .eq('type', opportunity.opportunity_type?.toLowerCase())
        .ilike('title', '%Inscrições%')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const now = new Date();
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);

        setRegistrationDates({ start: data.start_date, end: data.end_date });
        setIsRegistrationOpen(now >= start && now <= end);
      } else {
        setIsRegistrationOpen(true); // Default to open if no date found
      }
    };

    checkDates();
  }, [opportunity.opportunity_type, isPartner]);

  // Fetch campus data for MEC opportunities
  React.useEffect(() => {
    if (isPartner) return;
    const uuid = opportunity.id.replace('mec_', '');
    supabase
      .from('opportunities')
      .select('courses(campus_id, campus:campus(name, city, state))')
      .eq('id', uuid)
      .limit(1)
      .then(({ data }: { data: any[] | null }) => {
        const campusData = (data?.[0] as any)?.courses?.campus;
        if (campusData) setCampus(campusData);
      });
  }, [opportunity.id, isPartner]);

  // Fetch top matched opportunities (MEC + Partner), ordered by match_score desc
  React.useEffect(() => {
    const fetchSimilar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // profile_id in user_opportunity_matches is the activeProfileId (may differ from user.id for dependents)
      const profileId = activeProfileId || user.id;

      const { data: matches, error: matchErr } = await supabase
        .from('user_opportunity_matches')
        .select('unified_opportunity_id, match_score')
        .eq('profile_id', profileId)
        .neq('unified_opportunity_id', opportunity.id)
        .order('match_score', { ascending: false })
        .limit(10);

      if (!matches || matches.length === 0) return;

      const ids = matches.map((m: any) => m.unified_opportunity_id);

      const { data: opps } = await supabase
        .from('v_unified_opportunities')
        .select('unified_id, title, provider_name, location, opportunity_type, type, is_partner, category, badges, brand_color, institution_cover_url, created_at')
        .in('unified_id', ids);

      if (!opps || opps.length === 0) return;

      const scoreMap = Object.fromEntries(matches.map((m: any) => [m.unified_opportunity_id, m.match_score]));
      const sorted = [...opps].sort((a: any, b: any) => (scoreMap[b.unified_id] || 0) - (scoreMap[a.unified_id] || 0));

      const mapped = sorted.slice(0, 6).map((o: any) => ({
        id: o.unified_id,
        title: o.title,
        institution_name: o.provider_name,
        location: o.location,
        opportunity_type: o.opportunity_type ?? o.type,
        type: o.type,
        is_partner: o.is_partner,
        category: o.category,
        category_label: o.category,
        badges: Array.isArray(o.badges) ? o.badges.filter(Boolean) : [],
        brand_color: o.brand_color,
        institution_cover_url: o.institution_cover_url,
        created_at: o.created_at,
        match_score: scoreMap[o.unified_id] || null,
        education_level: 'Graduação',
      } as IUnifiedOpportunity));

      setSimilarOpps(mapped);
    };

    fetchSimilar();
  }, [opportunity.id, activeProfileId]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: opportunity.title,
        text: `${opportunity.title} — ${opportunity.institution_name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  const handleApply = async () => {
    if (opportunity.external_redirect?.enabled && opportunity.external_redirect?.url) {
      window.open(opportunity.external_redirect.url, '_blank');
      return;
    }
    if (!opportunity.is_partner) return;

    const partnerOppId = opportunity.id.replace('partner_', '');
    const profileId = activeProfileId || '';
    if (!profileId) {
      setApplyError('Selecione um perfil para continuar.');
      return;
    }

    setApplying(true);
    setApplyError(null);
    try {
      const { id } = await createApplication(partnerOppId, profileId);
      router.push(`/partner-forms/${id}`);
    } catch {
      setApplying(false);
      setApplyError('Erro ao iniciar candidatura. Tente novamente.');
    }
  };

  // Helper for Category Chips
  const categoryLabel = opportunity.opportunity_type?.toUpperCase() || 'PROGRAMA';

  // Formatter for JSON criteria
  const renderFormattedCriteria = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') return <p>{data}</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'badges') return null;

          let displayValue = String(value);
          let icon = <Info size={16} className="text-[#3092BB]" />;

          if (key === 'income') {
            displayValue = String(value);
            icon = <Award size={16} className="text-yellow-500" />;
          } else if (key === 'location') {
            displayValue = String(value);
            icon = <MapPin size={16} className="text-red-400" />;
          } else if (key === 'type' || key === 'scholarship_type') {
            displayValue = String(value);
            icon = <GraduationCap size={16} className="text-purple-400" />;
          } else if (key === 'dates' && Array.isArray(value)) {
            return (
              <div key={key} className="col-span-full bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Datas Importantes</p>
                {value.map((d: any, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>Início: {d.start_date}</span>
                    <span>Fim: {d.end_date}</span>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div key={key} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-3">
              <div className="mt-0.5">{icon}</div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{key.replace('_', ' ')}</p>
                <p className="text-sm font-semibold text-[#3A424E]">{displayValue}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full pb-32" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* ── Hero / Cover ── */}
      <section className="relative h-[220px] w-full rounded-b-[40px] md:rounded-t-3xl overflow-hidden">
        {/* Main Cover Image Container */}
        <div
          className="absolute inset-x-0 bottom-0 top-0 overflow-hidden shadow-lg mx-0"
          style={{
            background: isPartner
              ? brandColor
              : 'linear-gradient(239.86deg, rgba(48, 146, 187, 0.8) 9.15%, #3092BB 59.27%)'
          }}
        >
          {/* Image Overlay */}
          <img
            src={opportunity.institution_cover_url || "/assets/institution-cover.png"}
            className="w-full h-full object-cover mix-blend-soft-light opacity-60"
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Overlay Gradient for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        {/* Floating Controls on Hero */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <button
            onClick={() => router.back()}
            className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={onFavorite}
              className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all"
            >
              <Heart size={20} className={cn(isFavorited && 'fill-red-500 text-red-500 border-none')} />
            </button>
          </div>
        </div>

        {/* Category Chips on Hero */}
        <div className="absolute bottom-6 left-6 flex gap-2 z-20 overflow-x-auto pb-1 no-scrollbar">
          <span className="bg-white/90 backdrop-blur-md text-[#3092BB] text-[12px] font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            {categoryLabel}
          </span>
          <span className="bg-white/20 backdrop-blur-md text-white text-[12px] font-bold px-4 py-1.5 rounded-full border border-white/30 shadow-lg whitespace-nowrap">
            {opportunity.education_level || 'Graduação'}
          </span>
        </div>
      </section>

      {/* ── Opportunity Content Header ── */}
      <section className="px-6 mt-8 flex justify-between items-start">
        <div className="max-w-[75%]">
          <h1 className="text-3xl font-black text-[#3A424E] leading-tight tracking-tight">
            {opportunity.title}
          </h1>
          <Link
            href={`/instituicoes/${opportunity.institution_id}`}
            className="flex items-center gap-2 mt-2 text-[#3092BB] font-bold hover:underline"
          >
            <Building2 size={18} />
            <span className="text-sm">{opportunity.institution_name}</span>
          </Link>
          {campus && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ backgroundColor: '#024F86' }}>
                {campus.name}
              </span>
              <span className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ backgroundColor: '#38B1E4' }}>
                {campus.city} · {campus.state}
              </span>
            </div>
          )}
        </div>

        {/* Match Score Circular Badge */}
        {opportunity.match_score !== undefined && (
          <div className="relative size-16 shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100" strokeWidth="3" />
              <motion.circle
                cx="18" cy="18" r="16" fill="none"
                className="stroke-[#3092BB]"
                strokeWidth="3"
                strokeDasharray="100 100"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 100 - (Number(opportunity.match_score) || 0) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-[#3092BB] leading-none">
                {Math.round(Number(opportunity.match_score))}%
              </span>
              <span className="text-[7px] font-light text-[#3092BB] uppercase tracking-tighter">match</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Registration Period Alert ── */}
      {(opportunity.starts_at || opportunity.ends_at) && (
        <section className="px-6 mt-6">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] text-orange-400 font-bold uppercase">Período de Inscrição</p>
              <p className="text-sm font-bold text-[#3A424E]">
                {opportunity.starts_at ? new Date(opportunity.starts_at).toLocaleDateString('pt-BR') : 'A definir'} até {opportunity.ends_at ? new Date(opportunity.ends_at).toLocaleDateString('pt-BR') : 'A definir'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Metadata Grid ── */}
      <section className="grid grid-cols-2 gap-4 px-6 mt-8">
        {/* Localização */}
        <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50">
          <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-blue-500">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#707A7E] font-medium uppercase tracking-wider">Localização</p>
            <p className="text-[13px] font-bold text-[#3A424E] truncate">{opportunity.location || 'Nacional'}</p>
          </div>
        </div>

        {/* Turno — icons from relatedOpportunities */}
        <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50">
          <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-orange-500">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#707A7E] font-medium uppercase tracking-wider">Turno</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {(() => {
                const shifts = [...new Set(relatedOpportunities.map(r => r.shift).filter(Boolean))];
                if (shifts.length === 0) {
                  const badgeShift = opportunity.badges.find(b => ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EaD', 'EAD', 'Curso a distância'].includes(b));
                  if (badgeShift) shifts.push(badgeShift);
                }
                if (shifts.length === 0) return <span className="text-[13px] font-bold text-[#3A424E]">Consultar</span>;
                return shifts.map(shift => {
                  const map: Record<string, { Icon: any; color: string; title: string }> = {
                    'Matutino': { Icon: Sun, color: 'text-orange-500', title: 'Matutino' },
                    'Integral': { Icon: SunMoon, color: 'text-blue-500', title: 'Integral' },
                    'Vespertino': { Icon: Sunset, color: 'text-amber-500', title: 'Vespertino' },
                    'Noturno': { Icon: Moon, color: 'text-indigo-500', title: 'Noturno' },
                    'EaD': { Icon: Laptop, color: 'text-slate-500', title: 'EaD' },
                    'EAD': { Icon: Laptop, color: 'text-slate-500', title: 'EAD' },
                    'Curso a distância': { Icon: Laptop, color: 'text-slate-500', title: 'EaD' },
                  };
                  const s = map[shift] || { Icon: Sun, color: 'text-slate-400', title: shift };
                  return <s.Icon key={shift} size={20} className={s.color} title={s.title} />;
                });
              })()}
            </div>
          </div>
        </div>

        {/* Vagas */}
        <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50">
          <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-pink-500">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#707A7E] font-medium uppercase tracking-wider">Vagas</p>
            <p className="text-[13px] font-bold text-[#3A424E] truncate">
              {(() => {
                const totalVagas = relatedOpportunities.reduce((sum, opp) => {
                  const broad = Number(opp.vacancies?.broad_competition_offered) || 0;
                  const quotas = Number(opp.vacancies?.quotas_offered) || 0;
                  return sum + broad + quotas;
                }, 0);
                return totalVagas > 0 ? `${totalVagas} vagas` : (opportunity.nu_vagas_autorizadas || '--') + ' vagas';
              })()}
            </p>
          </div>
        </div>

        {/* Inscrições */}
        <div className="bg-white p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50">
          <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-emerald-500">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#707A7E] font-medium uppercase tracking-wider">Inscrições</p>
            <p className="text-[13px] font-bold text-[#3A424E] truncate">
              {(opportunity.starts_at || opportunity.ends_at)
                ? `${opportunity.starts_at ? new Date(opportunity.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '?'} a ${opportunity.ends_at ? new Date(opportunity.ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '?'}`
                : 'Em breve'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Statistics / Program Specifics ── */}
      <div className="px-6 mt-8 space-y-8">
        {!isPartner ? (
          <>
            <SisuProuniCard
              opportunity_type={opportunity.opportunity_type || 'SISU'}
              cycle_year={relatedOpportunities[0]?.year}
              cycle_semester={relatedOpportunities[0]?.semester}
              qt_inscricao_2025={opportunity.qt_inscricao_2025}
              min_cutoff_score={(() => {
                const validScores = relatedOpportunities.map(o => o.cutoff_score).filter((s): s is number => s != null);
                return validScores.length > 0 ? Math.min(...validScores) : null;
              })()}
              max_cutoff_score={(() => {
                const validScores = relatedOpportunities.map(o => o.cutoff_score).filter((s): s is number => s != null);
                return validScores.length > 0 ? Math.max(...validScores) : null;
              })()}
              vagas_ociosas_2025={opportunity.vagas_ociosas_2025}
              nu_vagas_autorizadas={(() => {
                const total = relatedOpportunities.reduce((sum, opp) => {
                  const broad = Number(opp.vacancies?.broad_competition_offered) || 0;
                  const quotas = Number(opp.vacancies?.quotas_offered) || 0;
                  return sum + broad + quotas;
                }, 0);
                return total > 0 ? total : opportunity.nu_vagas_autorizadas;
              })()}
              qt_aprovados={approvalStats?.reduce((sum, row) => sum + (Number(row.qt_aprovados) || 0), 0) || null}
            />

            {(opportunity.weights || opportunity.opportunity_type === 'prouni') && (
              <SisuScoreDisplay 
                weights={opportunity.weights || { redacao: 1, matematica: 1, linguagens: 1, humanas: 1, natureza: 1 }}
                opportunity_type={opportunity.opportunity_type}
                cycle_year={relatedOpportunities[0]?.year}
              />
            )}

            {/* ── Pesos do ENEM ── */}
            {opportunity.weights && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-[#3A424E] font-bold text-lg mb-4 flex items-center gap-2">
                  <Award size={20} className="text-[#3092BB]" />
                  Pesos do ENEM
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'redacao', label: 'RED', color: 'bg-red-50 text-red-600' },
                    { key: 'matematica', label: 'MAT', color: 'bg-blue-50 text-blue-600' },
                    { key: 'linguagens', label: 'LIN', color: 'bg-emerald-50 text-emerald-600' },
                    { key: 'humanas', label: 'HUM', color: 'bg-orange-50 text-orange-600' },
                    { key: 'natureza', label: 'NAT', color: 'bg-purple-50 text-purple-600' }
                  ].map((subject) => (
                    <div key={subject.key} className="flex flex-col items-center gap-1">
                      <div className={cn("size-10 rounded-xl flex items-center justify-center text-[10px] font-black", subject.color)}>
                        {subject.label}
                      </div>
                      <span className="text-xs font-black text-[#3A424E]">
                        {opportunity.weights![subject.key as keyof typeof opportunity.weights] || '1'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#636E7C] mt-4 leading-tight italic">
                  * Sua média será calculada ponderando suas notas por estes pesos oficiais do curso.
                </p>
              </motion.section>
            )}

            {/* ── Lista de Modalidades ── */}
            <OpportunitiesListCard
              opportunities={relatedOpportunities.length > 0 ? relatedOpportunities : [{
                id: opportunity.id,
                shift: 'Noturno',
                concurrency_tags: (opportunity as any).concurrency_tags,
                scholarship_tags: (opportunity as any).scholarship_tags,
                cutoff_score: opportunity.max_cutoff_score ?? null,
                opportunity_type: opportunity.opportunity_type,
                year: 2025,
                semester: '1'
              }]}
              highlightedOpportunityId={opportunity.id}
            />


            {/* ── Aprovados no Último Ciclo (SisU apenas) ── */}
            {approvalStats && approvalStats.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-[#3A424E] font-bold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  Aprovados no Último Ciclo
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[10px] text-[#707A7E] font-bold uppercase pb-2">Cota</th>
                        <th className="text-right text-[10px] text-[#707A7E] font-bold uppercase pb-2">Aprovados</th>
                        <th className="text-right text-[10px] text-[#707A7E] font-bold uppercase pb-2">Mín.</th>
                        <th className="text-right text-[10px] text-[#707A7E] font-bold uppercase pb-2">Máx.</th>
                        <th className="text-right text-[10px] text-[#707A7E] font-bold uppercase pb-2">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalStats.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-[#3A424E] font-medium text-xs max-w-[120px]" title={String(row.modalidade_concorrencia ?? '')}>
                            <span className="line-clamp-1">{String(row.tipo_concorrencia ?? row.modalidade_concorrencia ?? '—')}</span>
                          </td>
                          <td className="py-2 text-right text-[#3A424E] font-bold">
                            {row.qt_aprovados != null ? String(row.qt_aprovados) : '—'}
                          </td>
                          <td className="py-2 text-right text-[#636E7C]">
                            {row.nota_minima != null ? Number(row.nota_minima).toFixed(1) : '—'}
                          </td>
                          <td className="py-2 text-right text-[#636E7C]">
                            {row.nota_maxima != null ? Number(row.nota_maxima).toFixed(1) : '—'}
                          </td>
                          <td className="py-2 text-right text-[#3092BB] font-bold">
                            {row.nota_media != null ? Number(row.nota_media).toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#F8FBFF] rounded-[32px] p-8 border border-blue-100/50"
            >
              <h3 className="text-[#3A424E] font-black text-xl mb-6 flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-[#3092BB]/10 flex items-center justify-center text-[#3092BB]">
                  <CheckCircle2 size={24} />
                </div>
                Critérios de Elegibilidade
              </h3>
              <div className="space-y-4">
                {renderFormattedCriteria(opportunity.eligibility_criteria)}
              </div>
            </motion.section>

            {opportunity.benefits && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-gray-100"
              >
                <h3 className="text-[#3A424E] font-black text-xl mb-6 flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                    <Award size={24} />
                  </div>
                  Benefícios Exclusivos
                </h3>
                <div className="text-sm text-[#636E7C] leading-relaxed">
                  {typeof opportunity.benefits === 'string'
                    ? opportunity.benefits
                    : renderFormattedCriteria(opportunity.benefits)}
                </div>
              </motion.section>
            )}
          </div>
        )}
      </div>

      {/* ── Outras Oportunidades para Você ── */}
      {similarOpps.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[#3A424E] font-black text-lg mb-4 px-6">Outras Oportunidades para Você</h2>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory -mx-0 px-6 scrollbar-hide">
            {similarOpps.map((opp) => (
              <div key={opp.id} className="min-w-[85vw] max-w-[340px] snap-center shrink-0">
                <OpportunityCard
                  opportunity={opp}
                  onClickOverride={(id) => router.push(`/oportunidades/${id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Institution Card ── */}
      <section className="px-6 mt-12 mb-24">
        <h2 className="text-[#3A424E] font-black text-lg mb-4">Sobre a Instituição</h2>
        <div className="bg-white border border-gray-100 rounded-[32px] p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="size-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {opportunity.institution_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-lg font-black text-[#3A424E]">{opportunity.institution_name}</p>
              <div className="flex items-center gap-2 text-[#707A7E] text-xs font-bold mt-1">
                <MapPin size={14} />
                <span>{opportunity.location || 'Brasil'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase">IGC (MEC)</p>
              <p className="text-lg font-black text-[#3092BB]">{opportunity.institution_igc || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Organização</p>
              <p className="text-sm font-bold text-[#3A424E] line-clamp-1">{opportunity.institution_organization || 'Universidade'}</p>
            </div>
          </div>

          <Link
            href={`/instituicoes/${opportunity.institution_id}`}
            className="w-full h-12 rounded-full border-2 border-gray-100 flex items-center justify-center font-bold text-[#3A424E] hover:bg-gray-50 transition-colors gap-2"
          >
            Ver perfil completo
            <ExternalLink size={16} />
          </Link>
        </div>
      </section>

      {/* ── Sticky Bottom CTA ── */}
      {isEncerrado ? (
        <div className="fixed bottom-0 inset-x-0 p-6 bg-white/80 backdrop-blur-2xl border-t border-gray-100/50 z-50 flex flex-col gap-4 pb-10">
          <button
            disabled
            className="w-full h-14 rounded-full font-black text-lg text-[#868E96] shadow-none flex items-center justify-center gap-2 bg-[#F1F3F5] border border-[#DEE2E6] cursor-not-allowed"
          >
            Encerrado
          </button>
        </div>
      ) : isRegistrationOpen !== false && (
        <div className="fixed bottom-0 inset-x-0 p-6 bg-white/80 backdrop-blur-2xl border-t border-gray-100/50 z-50 flex flex-col gap-2 pb-10">
          {applyError && (
            <p className="text-center text-xs text-red-500 font-medium">{applyError}</p>
          )}
          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full h-14 rounded-full font-black text-lg text-white shadow-2xl shadow-[#3092BB]/30 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: brandColor }}
          >
            {applying ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <>
                {isPartner ? 'Candidatar Agora' : 'Quero me Candidatar'}
                {opportunity.external_redirect?.enabled && <ExternalLink size={18} />}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
