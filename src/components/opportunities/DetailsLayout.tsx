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
import PartnerDescriptionCard from './PartnerDescriptionCard';
import OpportunitiesListCard, { Opportunity } from './OpportunitiesListCard';
import SisuScoreDisplay from './SisuScoreDisplay';
import OpportunityCard from './OpportunityCard';
import CriteriaSection from './CriteriaSection';
import ImportantDatesSection from './ImportantDatesSection';
import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { createApplication, getExistingApplication } from '@/app/(app)/oportunidades/[id]/actions';

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
  bestConcurrencyType?: string;
}

export default function DetailsLayout({
  opportunity,
  relatedOpportunities = [],
  isFavorited,
  onFavorite,
  approvalStats,
  bestConcurrencyType,
}: DetailsLayoutProps) {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const { user, openAuthModal } = useAuth();
  const { isFavorited: isFavoritedContext, toggleFavorite } = useFavorites();
  const isActuallyFavorited = isFavorited !== undefined ? isFavorited : isFavoritedContext(opportunity.id);
  const [pendingApply, setPendingApply] = React.useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = React.useState<boolean | null>(null);
  const [registrationDates, setRegistrationDates] = React.useState<{ start: string; end: string } | null>(null);
  const [mecImportantDates, setMecImportantDates] = React.useState<{ title: string; start_date: string; end_date: string | null }[]>([]);
  const [campus, setCampus] = React.useState<{ name: string; city: string; state: string } | null>(null);
  const [applying, setApplying] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [similarOpps, setSimilarOpps] = React.useState<IUnifiedOpportunity[]>([]);
  const [coverStatus, setCoverStatus] = React.useState<'initial' | 'fallback' | 'failed'>('initial');
  const [existingApplication, setExistingApplication] = React.useState<{ id: string; status: string; redirect_url?: string | null } | null>(null);
  const [loadingApplication, setLoadingApplication] = React.useState(false);

  const isPartner = opportunity.is_partner;

  React.useEffect(() => {
    if (!user || !isPartner) {
      setExistingApplication(null);
      return;
    }

    const fetchExisting = async () => {
      setLoadingApplication(true);
      try {
        const partnerOppId = opportunity.id.replace('partner_', '');
        const profileId = activeProfileId || user.id;
        const app = await getExistingApplication(partnerOppId, profileId);
        setExistingApplication(app);
      } catch (err) {
        console.error('Error fetching existing application:', err);
      } finally {
        setLoadingApplication(false);
      }
    };

    fetchExisting();
  }, [user, activeProfileId, opportunity.id, isPartner]);

  const brandColor = opportunity.brand_color || (isPartner ? '#7030C2' : '#3092BB');

  const mobileFallback = isPartner ? "/assets/institution-partner-cover.png" : "/assets/institution-cover.png";
  const desktopFallback = isPartner ? "/assets/institution-partner-desktop-cover.png" : "/assets/institution-desktop-cover.png";

  const hasCustomCover = !!opportunity.institution_cover_url && opportunity.institution_cover_url !== 'null';
  const useFallback = !hasCustomCover || coverStatus === 'fallback';

  const currentDesktopSrc = useFallback ? desktopFallback : (opportunity.institution_cover_url || '');
  const currentMobileSrc = useFallback ? mobileFallback : (opportunity.institution_cover_url || '');

  const partnerStatus = opportunity.status as string | undefined;

  React.useEffect(() => {
    if (isPartner) {
      setIsRegistrationOpen(true);
      return;
    }

    let cancelled = false;
    const checkDates = async () => {
      const type = opportunity.opportunity_type?.toLowerCase();
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('important_dates')
        .select('title, start_date, end_date')
        .ilike('type', `%${type}%`)
        .or(`end_date.gte.${nowIso},and(end_date.is.null,start_date.gte.${nowIso})`)
        .order('start_date', { ascending: true })
        .limit(10);

      if (cancelled) return;

      if (data && data.length > 0) {
        // Only pass future dates to the display component
        const futureDates = data as { title: string; start_date: string; end_date: string | null }[];
        setMecImportantDates(futureDates);
        // Find registration dates for open/close check
        const inscricao = data.find((d: any) => d.title?.toLowerCase().includes('inscrições'));
        if (inscricao) {
          const now = new Date();
          setRegistrationDates({ start: inscricao.start_date, end: inscricao.end_date! });
          setIsRegistrationOpen(now >= new Date(inscricao.start_date) && now <= new Date(inscricao.end_date!));
        } else {
          setIsRegistrationOpen(true);
        }
      } else {
        setIsRegistrationOpen(true);
      }
    };

    checkDates();
    return () => { cancelled = true; };
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
        .select('unified_id, title, provider_name, location, opportunity_type, type, is_partner, category, badges, brand_color, institution_cover_url, created_at, min_cutoff_score_current, min_cutoff_score_prev, max_cutoff_score_current, max_cutoff_score_prev')
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
        category_label: o.category === 'educational_programs' ? 'Programas Educacionais' : o.category === 'public_universities' ? 'Universidades Públicas' : o.category === 'grants_scholarships' ? 'Bolsas e Gratuidades' : o.category,
        badges: Array.isArray(o.badges) ? o.badges.filter(Boolean) : [],
        brand_color: o.brand_color,
        institution_cover_url: o.institution_cover_url,
        created_at: o.created_at,
        match_score: scoreMap[o.unified_id] || null,
        education_level: 'Graduação',
        min_cutoff_score_current: o.min_cutoff_score_current,
        min_cutoff_score_prev: o.min_cutoff_score_prev,
        max_cutoff_score_current: o.max_cutoff_score_current,
        max_cutoff_score_prev: o.max_cutoff_score_prev,
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
    if (!user) {
      setPendingApply(true);
      openAuthModal('LOGIN');
      return;
    }

    if (!opportunity.is_partner) {
      if (opportunity.external_redirect?.enabled && opportunity.external_redirect?.url) {
        window.open(opportunity.external_redirect.url, '_blank');
      }
      return;
    }

    const partnerOppId = opportunity.id.replace('partner_', '');
    const profileId = activeProfileId || user.id;
    if (!profileId) {
      setApplyError('Selecione um perfil para continuar.');
      return;
    }

    if (existingApplication) {
      if (existingApplication.status === 'DRAFT') {
        router.push(`/partner-forms/${existingApplication.id}`);
        return;
      }
      if (existingApplication.status === 'redirected') {
        if (existingApplication.redirect_url) {
          window.open(existingApplication.redirect_url, '_blank');
        } else if (opportunity.external_redirect?.url) {
          window.open(opportunity.external_redirect.url, '_blank');
        }
        return;
      }
      if (existingApplication.status === 'REJECTED') {
        router.push(`/partner-forms/${existingApplication.id}`);
        return;
      }
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


  React.useEffect(() => {
    if (user && pendingApply && activeProfileId) {
      setPendingApply(false);
      handleApply();
    }
  }, [user, pendingApply, activeProfileId]);

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

  // Resolve effective registration status once — used by both inline banner & floating CTA
  let effectiveStatus: string | undefined;
  if (opportunity.status && opportunity.status !== 'approved') {
    effectiveStatus = opportunity.status;
  } else if (isPartner) {
    effectiveStatus = partnerStatus as string | undefined;
  } else {
    effectiveStatus = isRegistrationOpen === null
      ? undefined
      : (isRegistrationOpen ? 'opened' : 'closed');
  }

  const isOpen = effectiveStatus === 'opened' || effectiveStatus === 'approved';

  return (
    <>
    {/* ══ Main scrollable page ══ */}
    <div className="min-h-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
          {coverStatus !== 'failed' && (
            <picture className="w-full h-full">
              <source media="(min-width: 768px)" srcSet={currentDesktopSrc} />
              <img
                src={currentMobileSrc}
                className="w-full h-full object-cover mix-blend-soft-light opacity-60"
                alt=""
                onError={() => {
                  if (coverStatus === 'initial' && hasCustomCover) {
                    setCoverStatus('fallback');
                  } else {
                    setCoverStatus('failed');
                  }
                }}
              />
            </picture>
          )}
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
              onClick={() => {
                if (!user) {
                  openAuthModal('LOGIN');
                  return;
                }
                if (onFavorite) {
                  onFavorite();
                } else {
                  toggleFavorite(opportunity.id);
                }
              }}
              className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-all"
            >
              <Heart size={20} className={cn(isActuallyFavorited && 'fill-red-500 text-red-500 border-none')} />
            </button>
          </div>
        </div>

        {/* Category Chips on Hero */}
        <div className="absolute bottom-6 left-6 flex gap-2 z-20 overflow-x-auto pb-1 no-scrollbar">
          <span className="bg-white/90 backdrop-blur-md text-[#3092BB] text-[12px] font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            {categoryLabel}
          </span>
          <span className="bg-white/20 backdrop-blur-md text-white text-[12px] font-bold px-4 py-1.5 rounded-full border border-white/30 shadow-lg whitespace-nowrap">
            {opportunity.is_partner ? (opportunity.category_label || 'Graduação') : (opportunity.education_level || 'Graduação')}
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
        {opportunity.match_score != null && Number(opportunity.match_score) > 0 && (
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
        {!isPartner && (
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
        )}

        {/* Vagas */}
        {!isPartner && (
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
        )}

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
              qt_inscricao_prev={opportunity.qt_inscricao_current ?? opportunity.qt_inscricao_prev}
              min_cutoff_score={opportunity.opportunity_type?.toLowerCase() === 'prouni' ? null : (() => {
                const validScores = relatedOpportunities.map(o => o.cutoff_score).filter((s): s is number => s != null);
                return validScores.length > 0 ? Math.min(...validScores) : (opportunity.min_cutoff_score_current ?? opportunity.min_cutoff_score_prev ?? null);
              })()}
              max_cutoff_score={opportunity.opportunity_type?.toLowerCase() === 'prouni' ? null : (() => {
                const validScores = relatedOpportunities.map(o => o.cutoff_score).filter((s): s is number => s != null);
                return validScores.length > 0 ? Math.max(...validScores) : (opportunity.max_cutoff_score_current ?? opportunity.max_cutoff_score_prev ?? null);
              })()}
              vagas_ociosas_prev={opportunity.vagas_ociosas_current ?? opportunity.vagas_ociosas_prev}
              qt_aprovados={approvalStats?.reduce((sum, row) => sum + (Number(row.qt_aprovados) || 0), 0) || null}
              nu_media_minima_enem={opportunity.nu_media_minima_enem_current ?? opportunity.nu_media_minima_enem_prev ?? null}
              total_vacancies={(() => {
                const totalVagas = relatedOpportunities.reduce((sum, opp) => {
                  const broad = Number(opp.vacancies?.broad_competition_offered) || 0;
                  const quotas = Number(opp.vacancies?.quotas_offered) || 0;
                  return sum + broad + quotas;
                }, 0);
                return totalVagas > 0 ? totalVagas : (Number(opportunity.nu_vagas_autorizadas) || null);
              })()}
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
                cutoff_score: opportunity.max_cutoff_score_current ?? opportunity.max_cutoff_score_prev ?? null,
                opportunity_type: opportunity.opportunity_type,
                year: 2025,
                semester: '1'
              }]}
              highlightedOpportunityId={opportunity.id}
              bestConcurrencyType={!opportunity.is_partner ? bestConcurrencyType : undefined}
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
            {opportunity.description && (
              <PartnerDescriptionCard
                description={opportunity.description}
                brandColor={brandColor}
              />
            )}

            <CriteriaSection
              partnerOpportunityId={opportunity.id.replace('partner_', '')}
              legacyCriteria={opportunity.eligibility_criteria}
            />

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

      {/* ── Important Dates ── */}
      <div className="px-6 mt-8">
        <ImportantDatesSection
          isPartner={isPartner}
          opportunityType={opportunity.opportunity_type}
          startsAt={opportunity.starts_at}
          endsAt={opportunity.ends_at}
          mecDates={mecImportantDates}
          institutionId={opportunity.institution_id}
          opportunityId={opportunity.id?.replace('partner_', '').replace('mec_', '')}
        />
      </div>

      {/* ── Institution Card ── */}
      <section className="px-6 mt-12">
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

          {!isPartner && (
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
          )}

          <Link
            href={`/instituicoes/${opportunity.institution_id}`}
            className="w-full h-12 rounded-full border-2 border-gray-100 flex items-center justify-center font-bold text-[#3A424E] hover:bg-gray-50 transition-colors gap-2"
          >
            Ver perfil completo
            <ExternalLink size={16} />
          </Link>
        </div>
      </section>

      {/* ── Outras Oportunidades para Você ── */}
      {similarOpps.length > 0 && (
        <div className="mt-12 px-2">
          <OpportunityCarousel
            title="Outras Oportunidades para Você"
            opportunities={similarOpps}
            seeAllHref="/oportunidades"
          />
        </div>
      )}

      {/* ── Inline status banner (closed / incoming) — NOT floating ── */}
      {(() => {
        let effectiveStatus: string | undefined;
        if (opportunity.status && opportunity.status !== 'approved') {
          effectiveStatus = opportunity.status;
        } else if (isPartner) {
          effectiveStatus = partnerStatus;
        } else {
          effectiveStatus = isRegistrationOpen === null
            ? undefined
            : (isRegistrationOpen ? 'opened' : 'closed');
        }

        const btnBase = "w-full h-14 rounded-full font-black text-base flex items-center justify-center gap-2";

        if (effectiveStatus === 'closed') {
          return (
            <div className="px-4 md:px-8 pb-8 pt-4">
              <button disabled className={`${btnBase} bg-white border border-gray-200 text-[#868E96] shadow-sm cursor-not-allowed`}>
                Inscrições encerradas
              </button>
            </div>
          );
        }

        if (effectiveStatus === 'incoming') {
          return (
            <div className="px-4 md:px-8 pb-8 pt-4">
              <button disabled className={`${btnBase} bg-amber-50 border border-amber-200 text-amber-600 shadow-sm cursor-not-allowed`}>
                Inscrições em breve
              </button>
            </div>
          );
        }

        // 'opened' → floating pill rendered below as sibling, add padding to avoid overlap
        if (isOpen) {
          return <div className="pb-28" />;
        }

        return null;
      })()}
    </div>

    {/* ══ Floating CTA — only when registrations are OPEN ══
        Rendered as a sibling to the main div (outside any transformed ancestor)
        so position:fixed works reliably on all browsers and devices. */}
    {isOpen && (() => {
      const floatShell = "fixed bottom-6 left-4 right-4 md:left-8 md:right-8 z-[200] flex flex-col items-stretch gap-2";
      const btnBase = "w-full h-14 rounded-full font-black text-base flex items-center justify-center gap-2 transition-all duration-200";
      const shadow = isPartner ? 'shadow-[#7030C2]/40' : 'shadow-[#3092BB]/40';
      
      let label = isPartner ? 'Candidatar Agora' : 'Quero me Candidatar';
      let isDisabled = applying || loadingApplication;
      
      if (isPartner && existingApplication) {
        const status = existingApplication.status;
        if (status === 'DRAFT') {
          label = 'Continuar Rascunho';
        } else if (status === 'redirected') {
          label = 'Acessar Link de Inscrição';
        } else if (['SUBMITTED', 'IN_REVIEW', 'APPROVED'].includes(status)) {
          label = 'Já Candidatado';
          isDisabled = true;
        } else if (status === 'REJECTED') {
          label = 'Tentar Novamente';
        }
      }

      return (
        <div className={floatShell}>
          {applyError && <p className="text-center text-xs text-red-500 font-medium bg-white px-3 py-1 rounded-full shadow-md">{applyError}</p>}
          <button
            onClick={handleApply}
            disabled={isDisabled}
            className={`${btnBase} text-white shadow-2xl ${shadow} active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
            style={{ background: brandColor }}
          >
            {applying || loadingApplication ? <Loader2 size={22} className="animate-spin" /> : (
              <>{label}{(opportunity.external_redirect?.enabled || (existingApplication?.status === 'redirected')) && <ExternalLink size={18} />}</>
            )}
          </button>
        </div>
      );
    })()}
    </>
  );
}
