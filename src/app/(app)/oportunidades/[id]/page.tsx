// Opportunity Detail Page — Sprint 02 Wave 4
// Server Component — fetches single opportunity from v_unified_opportunities.
// Conditional layout:
//   - is_partner → cover + logo from partner_institutions + RedirectButton
//   - MEC        → cutoff score badges + institution info

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import RedirectButton from './RedirectButton';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
}

async function getOpportunity(unifiedId: string): Promise<IUnifiedOpportunity | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('unified_id', unifiedId)
    .single();

  if (error || !data) return null;

  return {
    id:               data.unified_id,
    title:            data.title,
    institution_name: data.provider_name,
    is_partner:       data.is_partner,
    type:             data.type,
    opportunity_type: data.opportunity_type ?? data.type,
    category:         data.category,
    category_label:   data.category,
    location:         data.location,
    education_level:  'Graduação',
    badges:           Array.isArray(data.badges) ? data.badges.filter(Boolean) : [],
    created_at:       data.created_at,
    external_redirect: data.external_redirect_url
      ? { enabled: data.external_redirect_enabled, url: data.external_redirect_url }
      : undefined,
  };
}

async function getPartnerBranding(institutionName: string) {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('institutions')
    .select('id, partner_institutions(logo_url, cover_url, description, brand_color)')
    .eq('name', institutionName)
    .single();

  return (data as any)?.partner_institutions ?? null;
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const unifiedId = decodeURIComponent(id);
  const opportunity = await getOpportunity(unifiedId);

  if (!opportunity) notFound();

  const partnerBranding = opportunity.is_partner
    ? await getPartnerBranding(opportunity.institution_name)
    : null;

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        {/* Back navigation */}
        <div className="px-4 pt-6 pb-2">
          <Link
            href="/oportunidades"
            className="flex items-center gap-2 text-[14px] font-medium"
            style={{ color: '#3092bb', fontFamily: 'Montserrat, sans-serif' }}
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        {/* Hero */}
        {opportunity.is_partner && partnerBranding?.cover_url ? (
          <div className="relative w-full h-[200px]">
            <img
              src={partnerBranding.cover_url}
              alt={`Capa de ${opportunity.institution_name}`}
              className="w-full h-full object-cover"
            />
            {partnerBranding.logo_url && (
              <div className="absolute bottom-[-28px] left-6 w-[56px] h-[56px] rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
                <img
                  src={partnerBranding.logo_url}
                  alt={`Logo ${opportunity.institution_name}`}
                  className="w-full h-full object-contain p-1"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full h-[120px]"
            style={{
              background: 'linear-gradient(239.861deg, rgba(48,146,187,0.5) 9.15%, rgb(48,146,187) 59.27%)',
            }}
          />
        )}

        {/* Content */}
        <div className="px-4 pt-8 pb-8 flex flex-col gap-4">
          <div>
            <h1
              className="font-bold text-[20px] leading-tight"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              {opportunity.title}
            </h1>
            <p
              className="text-[15px] font-medium mt-1"
              style={{ color: 'rgba(58,66,78,0.7)', fontFamily: 'Montserrat, sans-serif' }}
            >
              {opportunity.institution_name}
            </p>
          </div>

          <div
            className="flex items-center gap-2 text-[14px] font-medium"
            style={{ color: 'rgba(58,66,78,0.7)', fontFamily: 'Montserrat, sans-serif' }}
          >
            <MapPin size={16} style={{ color: '#3092bb' }} />
            {opportunity.location}
          </div>

          {opportunity.is_partner && partnerBranding?.description && (
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: 'rgba(58,66,78,0.9)', fontFamily: 'Montserrat, sans-serif' }}
            >
              {partnerBranding.description}
            </p>
          )}

          {!opportunity.is_partner && opportunity.badges.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2
                className="font-semibold text-[15px]"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                Informações
              </h2>
              <div className="flex flex-wrap gap-2">
                {opportunity.badges.map((badge, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-[13px] font-medium border"
                    style={{ borderColor: '#FFB800', color: '#FFB800', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Client-side redirect button — extracted to separate component (no inline 'use client') */}
          {opportunity.is_partner &&
            opportunity.external_redirect?.enabled &&
            opportunity.external_redirect.url && (
              <RedirectButton
                opportunityId={opportunity.id}
                redirectUrl={opportunity.external_redirect.url}
                institutionName={opportunity.institution_name}
              />
            )}
        </div>
      </div>
    </AppShell>
  );
}
