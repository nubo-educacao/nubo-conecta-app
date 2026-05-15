// Institution Detail Page — Sprint 8.0
// Fixes:
//   - Usa v_unified_institutions para lookup: funciona para MEC e parceiras (sem 404)
//   - Oportunidades filtradas por institution_id (não mais por provider_name)
//   - Header com brand_color quando parceira; Nubo padrão para MEC
//   - Label de navegação dinâmico: 'Instituições' (genérico)
//   - Empty state quando sem oportunidades
//   - Localização exibida quando disponível

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, BookOpen, MapPin } from 'lucide-react';
import Link from 'next/link';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import { getUnifiedInstitutionById } from '@/services/institutions';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import RequireAuth from '@/components/auth/RequireAuth';
import FavoriteInstitutionButton from './FavoriteInstitutionButton';
import ShareInstitutionButton from './ShareInstitutionButton';
import CoverImage from './CoverImage';
import Paginator from './Paginator';
import CampusFilter from './CampusFilter';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const NUBO_GRADIENT = 'linear-gradient(239.86deg, #38B1E4 9.15%, #024F86 59.27%)';

export default async function InstitutionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const searchParamsObj = await searchParams;
  const currentPage = Math.max(1, parseInt(searchParamsObj.page as string || '1') || 1);
  const pageSize = 15;

  // ── Lookup via v_unified_institutions (funciona para MEC e parceiras) ────────
  const institution = await getUnifiedInstitutionById(id);
  if (!institution) notFound();

  const isPartner = institution.type === 'partner';

  // ── Oportunidades filtradas por institution_id ────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { },
      },
    },
  );

  // ── Extrair Campus Únicos (Locations) ────────────────────────────────────
  const { data: allLocationsData } = await supabase
    .from('v_unified_opportunities')
    .select('location')
    .eq('institution_id', id);

  const uniqueLocations = Array.from(
    new Set((allLocationsData ?? []).map((o: any) => o.location).filter(Boolean))
  ).sort() as string[];

  // ── Oportunidades Paginadas (com filtro de localização) ───────────────────
  let oppQuery = supabase
    .from('v_unified_opportunities')
    .select('*', { count: 'exact' })
    .eq('institution_id', id);

  if (searchParamsObj.location) {
    oppQuery = oppQuery.eq('location', searchParamsObj.location);
  }

  const { data: oppRows, count } = await oppQuery
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

  const opportunities: IUnifiedOpportunity[] = (oppRows ?? []).map((row: any) => ({
    id: row.unified_id,
    title: row.title,
    institution_name: row.provider_name,
    is_partner: row.is_partner,
    type: row.type,
    opportunity_type: row.opportunity_type ?? row.type,
    category: row.category,
    category_label: row.category,
    location: row.location,
    education_level: 'Programa',
    badges: Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
    created_at: row.created_at,
    status: row.status ?? undefined,
    starts_at: row.starts_at ?? undefined,
    ends_at: row.ends_at ?? undefined,
    min_cutoff_score: row.min_cutoff_score,
    max_cutoff_score: row.max_cutoff_score,
    external_redirect: row.external_redirect_url
      ? { enabled: row.external_redirect_enabled, url: row.external_redirect_url }
      : undefined,
  }));

  // ── Header gradient ───────────────────────────────────────────────────────
  const headerGradient = isPartner && institution.brand_color
    ? `linear-gradient(239.86deg, ${institution.brand_color}cc 9.15%, ${institution.brand_color} 59.27%)`
    : NUBO_GRADIENT;

  return (
    <AppShell>
      <RequireAuth />
      <div className="flex flex-col min-h-screen pb-20 bg-white md:bg-transparent">
        {/* Cover Image & Header */}
        <div className="relative w-full h-[200px] overflow-hidden md:rounded-t-3xl" style={{ background: headerGradient }}>
          <div className="absolute inset-0">
            <CoverImage
              src={(isPartner && institution.cover_url) ? institution.cover_url : "/assets/institution-cover.png"}
              fallbackSrc="/assets/institution-cover.png"
              alt={`Capa de ${institution.name}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>

          {/* Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <Link
              href="/instituicoes"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm transition-colors text-white hover:bg-white/30"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <ShareInstitutionButton
                institutionName={institution.name}
                location={institution.location}
                institutionId={institution.id}
              />
              <FavoriteInstitutionButton institutionId={institution.id} />
            </div>
          </div>

          {/* Name & Logo OVERLAY */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-3 items-end z-10">
            <div
              className="flex items-center justify-center w-[56px] h-[56px] rounded-[16px] text-white text-lg font-bold shadow-lg border border-white"
              style={{ background: isPartner && institution.brand_color ? institution.brand_color : '#3092bb' }}
            >
              {isPartner && institution.logo_url ? (
                <img
                  src={institution.logo_url}
                  alt={`Logo ${institution.name}`}
                  className="w-full h-full object-contain rounded-[16px]"
                />
              ) : (
                (institution.acronym || institution.name.substring(0, 2)).toUpperCase()
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-bold text-[20px] leading-tight text-white"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {institution.name}
                </h1>
              </div>
              {institution.location && (
                <p
                  className="flex items-center gap-1 text-[12px] mt-1 font-normal text-white/80"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <MapPin size={12} />
                  {institution.location}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-5 pb-8 flex flex-col gap-4 md:bg-white/40 md:backdrop-blur-sm md:rounded-b-3xl md:min-h-[calc(100vh-280px)]">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {institution.opp_types && institution.opp_types.length > 0 && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(48,146,187,0.1)', color: '#3092bb', fontFamily: 'Montserrat, sans-serif' }}
              >
                {institution.opp_types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
              </span>
            )}
            {institution.academic_organization && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(112,48,194,0.1)', color: '#7030c2', fontFamily: 'Montserrat, sans-serif' }}
              >
                {institution.academic_organization}
              </span>
            )}
            {institution.administrative_category && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: '#f3f4f6', color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
              >
                {institution.administrative_category}
              </span>
            )}
            {institution.type === 'partner' && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(255,153,0,0.1)', color: '#d97706', fontFamily: 'Montserrat, sans-serif' }}
              >
                Parceira
              </span>
            )}
          </div>

          {/* Descrição */}
          {institution.description && (
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              {institution.description}
            </p>
          )}

          {/* Box de contagem de oportunidades */}
          {(count ?? 0) > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-3 rounded-[14px] border border-[#7030C2]/50"
              style={{ background: 'rgba(112,48,194,0.05)' }}
            >
              <div className="flex items-center justify-center bg-white rounded-md w-6 h-6 shadow-sm border border-gray-100 shrink-0">
                <BookOpen size={12} color="#7030c2" />
              </div>
              <span
                className="text-[14px] font-semibold"
                style={{ color: '#3A424E', fontFamily: 'Montserrat, sans-serif' }}
              >
                {count} {(count ?? 0) === 1 ? 'oportunidade disponível' : 'oportunidades disponíveis'}
              </span>
            </div>
          )}

          {/* Vagas em Aberto */}
          <div className="flex flex-col gap-3 mt-4">
            <h2
              className="font-bold text-[16px] mb-2"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              Vagas em Aberto
            </h2>

            <CampusFilter locations={uniqueLocations} />

            {opportunities.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 gap-3 rounded-[16px]"
                style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)' }}
              >
                <p
                  className="text-[14px]"
                  style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
                >
                  Nenhuma oportunidade disponível no momento
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full justify-items-center">
                  {opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>

                {/* Paginação */}
                {count && count > pageSize && (
                  <Paginator currentPage={currentPage} totalPages={Math.ceil(count / pageSize)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
