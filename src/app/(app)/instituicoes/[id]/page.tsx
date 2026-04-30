// Institution Detail Page — Sprint 02 Wave 4
// Shows partner institution branding + their approved opportunities.
// Server Component.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InstitutionDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // Fetch institution + branding
  const { data: institution, error } = await supabase
    .from('institutions')
    .select(`
      id,
      name,
      partner_institutions (
        logo_url,
        cover_url,
        description,
        brand_color
      )
    `)
    .eq('id', id)
    .eq('is_partner', true)
    .single();

  if (error || !institution) notFound();

  const branding = (institution as any).partner_institutions;

  // Fetch approved opportunities for this institution from the unified view
  const { data: oppRows } = await supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('is_partner', true)
    .order('created_at', { ascending: false });

  // Filter client-side by institution name (view exposes provider_name, not institution_id)
  const opportunities: IUnifiedOpportunity[] = (oppRows ?? [])
    .filter((row: any) => row.provider_name === institution.name)
    .map((row: any) => ({
      id:               row.unified_id,
      title:            row.title,
      institution_name: row.provider_name,
      is_partner:       true,
      type:             row.type,
      opportunity_type: row.opportunity_type ?? row.type,
      category:         row.category,
      category_label:   row.category,
      location:         row.location,
      education_level:  'Programa',
      badges:           Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
      created_at:       row.created_at,
      external_redirect: row.external_redirect_url
        ? { enabled: row.external_redirect_enabled, url: row.external_redirect_url }
        : undefined,
    }));

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        {/* Back */}
        <div className="px-4 pt-6 pb-2">
          <Link
            href="/instituicoes"
            className="flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: '#7030C2', fontFamily: 'Montserrat, sans-serif' }}
          >
            <ArrowLeft size={16} />
            Instituições Parceiras
          </Link>
        </div>

        {/* Hero cover - Fixed Purple Branding theme (Sprint 7) */}
        <div
          className="relative w-full h-[180px] bg-[#522A87] overflow-hidden"
          style={{
            background: 'linear-gradient(239.86deg, #522A87 9.15%, #7030C2 59.27%)',
          }}
        >
          {branding?.cover_url && (
            <img
              src={branding.cover_url}
              alt={`Capa de ${institution.name}`}
              className="w-full h-full object-cover opacity-60 mix-blend-soft-light"
            />
          )}
          
          {/* Wave/Cloud divider for the header - matching OpportunityCard aesthetics */}
          <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
            <div className="relative w-full h-[40px]">
              <img
                src="/assets/card-background.svg"
                alt=""
                className="w-full h-full object-cover object-bottom invert brightness-200 opacity-20"
              />
            </div>
          </div>
          {branding?.logo_url && (
            <div className="absolute bottom-[-28px] left-6 w-[56px] h-[56px] rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
              <img
                src={branding.logo_url}
                alt={`Logo ${institution.name}`}
                className="w-full h-full object-contain p-1"
              />
            </div>
          )}
        </div>

        <div className="px-4 pt-10 pb-8 flex flex-col gap-6">
          {/* Institution name + description */}
          <div>
            <h1
              className="font-bold text-[20px]"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              {institution.name}
            </h1>
            {branding?.description && (
              <p
                className="text-[14px] mt-2 leading-relaxed"
                style={{ color: 'rgba(58,66,78,0.9)', fontFamily: 'Montserrat, sans-serif' }}
              >
                {branding.description}
              </p>
            )}
          </div>

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2
                className="font-bold text-[15px]"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                Oportunidades disponíveis
              </h2>
              <div className="flex flex-col gap-4 items-center">
                {opportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
