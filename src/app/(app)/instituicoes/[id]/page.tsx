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

interface PageProps {
  params: Promise<{ id: string }>;
}

const NUBO_GRADIENT = 'linear-gradient(239.86deg, #38B1E4 9.15%, #024F86 59.27%)';

export default async function InstitutionDetailPage({ params }: PageProps) {
  const { id } = await params;

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
        setAll: () => {},
      },
    },
  );

  const { data: oppRows } = await supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('institution_id', id)
    .order('created_at', { ascending: false });

  const opportunities: IUnifiedOpportunity[] = (oppRows ?? []).map((row: any) => ({
    id:               row.unified_id,
    title:            row.title,
    institution_name: row.provider_name,
    is_partner:       row.is_partner,
    type:             row.type,
    opportunity_type: row.opportunity_type ?? row.type,
    category:         row.category,
    category_label:   row.category,
    location:         row.location,
    education_level:  'Programa',
    badges:           Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
    created_at:       row.created_at,
    status:           row.status ?? undefined,
    starts_at:        row.starts_at ?? undefined,
    ends_at:          row.ends_at ?? undefined,
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
      <div className="flex flex-col min-h-screen">
        {/* Back */}
        <div className="px-4 pt-6 pb-2">
          <Link
            href="/instituicoes"
            className="flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: '#7030C2', fontFamily: 'Montserrat, sans-serif' }}
          >
            <ArrowLeft size={16} />
            Instituições
          </Link>
        </div>

        {/* Hero cover */}
        <div
          className="relative w-full h-[180px] overflow-hidden"
          style={{ background: headerGradient }}
        >
          {isPartner && institution.cover_url && (
            <img
              src={institution.cover_url}
              alt={`Capa de ${institution.name}`}
              className="w-full h-full object-cover opacity-60 mix-blend-soft-light"
            />
          )}

          {/* Logo / ícone */}
          <div className="absolute bottom-[-28px] left-6 w-[56px] h-[56px] rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
            {isPartner && institution.logo_url ? (
              <img
                src={institution.logo_url}
                alt={`Logo ${institution.name}`}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <BookOpen size={22} style={{ color: institution.brand_color ?? '#38B1E4' }} />
            )}
          </div>
        </div>

        <div className="px-4 pt-10 pb-8 flex flex-col gap-6">
          {/* Nome + localização + descrição */}
          <div>
            <h1
              className="font-bold text-[20px]"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              {institution.name}
            </h1>
            {institution.location && (
              <p
                className="flex items-center gap-1 text-[13px] mt-1 font-medium"
                style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
              >
                <MapPin size={13} />
                {institution.location}
              </p>
            )}
            {institution.description && (
              <p
                className="text-[14px] mt-2 leading-relaxed"
                style={{ color: 'rgba(58,66,78,0.9)', fontFamily: 'Montserrat, sans-serif' }}
              >
                {institution.description}
              </p>
            )}
          </div>

          {/* Box de contagem de oportunidades */}
          {opportunities.length > 0 && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
              style={{ background: 'rgba(56,177,228,0.08)' }}
            >
              <span
                className="text-[13px] font-bold"
                style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
              >
                {opportunities.length} {opportunities.length === 1 ? 'oportunidade disponível' : 'oportunidades disponíveis'}
              </span>
            </div>
          )}

          {/* Vagas em Aberto */}
          <div className="flex flex-col gap-4">
            <h2
              className="font-bold text-[15px]"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              Vagas em Aberto
            </h2>

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
              <div className="flex flex-col gap-4 items-center">
                {opportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
