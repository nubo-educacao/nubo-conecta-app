// Opportunity Detail Page — Sprint 7.0 Enrichment
// Server Component — fetches single opportunity from enriched v_unified_opportunities.
// Decomposed into DetailsLayout for maintainability and pixel-perfect Figma parity.

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { notFound } from 'next/navigation';
import DetailsLayout from '@/components/opportunities/DetailsLayout';
import AppShell from '@/components/layout/AppShell';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import type { Opportunity } from '@/components/opportunities/OpportunitiesListCard';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * createSupabaseServerClient - Helper for SSR data fetching
 */
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

/**
 * getOpportunity - Fetches enriched metadata from the unified view
 * Hydrates match_score from user_opportunity_matches if a session exists.
 */
async function getOpportunity(unifiedId: string): Promise<IUnifiedOpportunity | null> {
  const supabase = await createSupabaseServerClient();
  
  // Get current user to hydrate match_score
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('v_unified_opportunities')
    .select('*')
    .eq('unified_id', unifiedId);

  const { data: oppData, error: oppError } = await query.single();

  if (oppError || !oppData) return null;

  // Hydrate Match Score if user is logged in
  let matchScore = null;
  if (user) {
    const { data: matchData } = await supabase
      .from('user_opportunity_matches')
      .select('match_score')
      .eq('unified_opportunity_id', unifiedId)
      .eq('profile_id', user.id)
      .maybeSingle();
    
    if (matchData) {
      matchScore = matchData.match_score;
    }
  }

  // Hydrate Description for Partner Opportunities
  let description = undefined;
  if (oppData.is_partner) {
    const { data: partnerData } = await supabase
      .from('partner_opportunities')
      .select('description')
      .eq('id', unifiedId.replace('partner_', ''))
      .maybeSingle();
    description = partnerData?.description;
  }

  return {
    id:               oppData.unified_id,
    title:            oppData.title,
    institution_name: oppData.provider_name,
    is_partner:       oppData.is_partner,
    type:             oppData.type,
    opportunity_type: oppData.opportunity_type ?? oppData.type,
    category:         oppData.category,
    category_label:   oppData.category,
    location:         oppData.location,
    education_level:  'Graduação',
    badges:           Array.isArray(oppData.badges) ? oppData.badges.filter(Boolean) : [],
    created_at:       oppData.created_at,
    match_score:      matchScore, // Use hydrated score
    external_redirect: oppData.external_redirect_url
      ? { enabled: oppData.external_redirect_enabled, url: oppData.external_redirect_url }
      : undefined,
    // Deep Details Metadata
    institution_id:       oppData.institution_id,
    nu_vagas_autorizadas: oppData.nu_vagas_autorizadas,
    qt_vagas_ofertadas:   oppData.qt_vagas_ofertadas,
    qt_inscricao_2025:    oppData.qt_inscricao_2025,
    vagas_ociosas_2025:   oppData.vagas_ociosas_2025,
    institution_igc:      oppData.institution_igc,
    institution_organization: oppData.institution_organization,
    institution_category:     oppData.institution_category,
    institution_site:         oppData.institution_site,
    eligibility_criteria:     oppData.eligibility_criteria,
    benefits:                 oppData.benefits,
    brand_color:              oppData.brand_color,
    institution_cover_url:    oppData.institution_cover_url,
    weights:                  oppData.weights,
    description:              description,
  };
}

/**
 * getRelatedOpportunities - Fetches all modalities (shifts/quotas) for the same course
 */
async function getRelatedOpportunities(unifiedId: string): Promise<Opportunity[]> {
  const supabase = await createSupabaseServerClient();
  const uuid = unifiedId.replace('mec_', '').replace('partner_', '');

  // 1. Get the course_id for this opportunity
  const { data: currentOpp } = await supabase
    .from('opportunities')
    .select('course_id, institution_id')
    .eq('id', uuid)
    .single();

  if (!currentOpp) return [];

  // 2. Get all opportunities for this course and institution
  const { data: related } = await supabase
    .from('opportunities')
    .select('*')
    .eq('course_id', currentOpp.course_id)
    .eq('institution_id', currentOpp.institution_id)
    .order('shift', { ascending: true });

  if (!related) return [];

  return related.map(r => ({
    id: `mec_${r.id}`,
    shift: r.shift,
    scholarship_type: r.scholarship_type,
    concurrency_type: r.concurrency_type,
    concurrency_tags: r.concurrency_tags,
    scholarship_tags: r.scholarship_tags,
    cutoff_score: r.cutoff_score,
    opportunity_type: r.opportunity_type,
    year: r.year,
    semester: r.semester
  }));
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const unifiedId = decodeURIComponent(id);
  const [opportunity, relatedOpportunities] = await Promise.all([
    getOpportunity(unifiedId),
    getRelatedOpportunities(unifiedId)
  ]);

  if (!opportunity) {
    notFound();
  }

  return (
    <AppShell>
      <DetailsLayout 
        opportunity={opportunity}
        relatedOpportunities={relatedOpportunities}
      />
    </AppShell>
  );
}
