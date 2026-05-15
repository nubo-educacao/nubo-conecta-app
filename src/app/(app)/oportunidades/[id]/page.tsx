// Opportunity Detail Page — Sprint 7.0 Enrichment
// Server Component — fetches single opportunity from enriched v_unified_opportunities.
// Decomposed into DetailsLayout for maintainability and pixel-perfect Figma parity.

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { notFound } from 'next/navigation';
import DetailsLayout from '@/components/opportunities/DetailsLayout';
import RequireAuth from '@/components/auth/RequireAuth';
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
  // Partner opportunities have no modalities to list
  if (!unifiedId.startsWith('mec_')) return [];

  const supabase = await createSupabaseServerClient();
  // unified_id is now mec_<course.id> — use it directly as course_id
  const courseId = unifiedId.replace('mec_', '');

  const { data: allRelated } = await supabase
    .from('opportunities')
    .select('*')
    .eq('course_id', courseId)
    .order('year', { ascending: false })
    .order('semester', { ascending: false })
    .order('shift', { ascending: true });

  if (!allRelated || allRelated.length === 0) return [];

  // Filter only the most recent cycle
  const latestYear = allRelated[0].year;
  const latestSemester = allRelated[0].semester;
  
  const related = allRelated.filter(r => r.year === latestYear && r.semester === latestSemester);

  const oppIds = related.map(r => r.id);

  const [ { data: sisuVacancies }, { data: prouniVacancies } ] = await Promise.all([
    supabase.from('opportunities_sisu_vacancies').select('*').in('opportunity_id', oppIds),
    supabase.from('opportunities_prouni_vacancies').select('*').in('opportunity_id', oppIds),
  ]);

  const mapped = related.map(r => {
    const sisuVac = sisuVacancies?.find((sv: any) => sv.opportunity_id === r.id);
    const prouniVac = prouniVacancies?.filter((pv: any) => pv.opportunity_id === r.id) || [];
    
    let vacancies = null;
    let concurrency_type = r.concurrency_type;

    if (sisuVac) {
       vacancies = {
         broad_competition_offered: sisuVac.qt_vagas_ofertadas,
         quotas_offered: 0,
       };
       if (sisuVac.tp_cota || sisuVac.ds_mod_concorrencia) {
         concurrency_type = String(sisuVac.tp_cota ?? sisuVac.ds_mod_concorrencia);
       }
    } else if (prouniVac.length > 0) {
       const ampla = prouniVac.reduce((sum: number, v: any) => sum + (v.bolsas_ampla_ofertada || 0), 0);
       const cota = prouniVac.reduce((sum: number, v: any) => sum + (v.bolsas_cota_ofertada || 0), 0);
       vacancies = {
         broad_competition_offered: ampla,
         quotas_offered: cota,
       };
    } else {
       vacancies = r.vacancies; // fallback to jsonb if not normalized yet
    }

    let cutoff_score = r.cutoff_score;
    let cutoff_score_year = null;

    if (cutoff_score == null) {
      const pastMatch = allRelated.find(past => {
         const isOlder = past.year < r.year || (past.year === r.year && (past.semester || '') < (r.semester || ''));
         const isSameShift = past.shift === r.shift;
         
         const isSameQuota = (r.concurrency_tags && past.concurrency_tags)
           ? JSON.stringify(past.concurrency_tags) === JSON.stringify(r.concurrency_tags)
           : past.concurrency_type === r.concurrency_type;

         return isOlder && isSameShift && isSameQuota && past.cutoff_score != null;
      });
      if (pastMatch) {
         cutoff_score = pastMatch.cutoff_score;
         cutoff_score_year = pastMatch.year;
      }
    }

    return {
      id: `mec_${r.id}`,
      shift: r.shift,
      scholarship_type: r.scholarship_type,
      concurrency_type,
      concurrency_tags: r.concurrency_tags,
      scholarship_tags: r.scholarship_tags,
      cutoff_score,
      cutoff_score_year,
      opportunity_type: r.opportunity_type,
      year: r.year,
      semester: r.semester,
      vacancies: vacancies ?? null,
      _raw_tp_cota: sisuVac?.tp_cota ?? sisuVac?.ds_mod_concorrencia ?? null,
    };
  });

  // Deduplicate identical modalities
  const uniqueRelated: Opportunity[] = [];
  const seen = new Set();
  
  for (const item of mapped) {
    // create a unique signature for this opportunity to filter DB duplicates
    const key = `${item.year}|${item.semester}|${item.shift}|${item._raw_tp_cota || item.concurrency_type}|${JSON.stringify(item.concurrency_tags)}|${item.cutoff_score}|${item.vacancies?.broad_competition_offered}`;
    if (!seen.has(key)) {
      seen.add(key);
      const { _raw_tp_cota, ...cleanItem } = item;
      uniqueRelated.push(cleanItem as Opportunity);
    }
  }

  return uniqueRelated;
}

type SisuVacancyRow = Record<string, unknown>;
type ProuniVacancyRow = Record<string, unknown>;
type ApprovalRow = Record<string, unknown>;

/**
 * getApprovalStats — queries opportunities_sisu_approvals for approved-student statistics.
 * Returns null if the table does not exist yet or no data found.
 */
async function getApprovalStats(unifiedId: string): Promise<ApprovalRow[] | null> {
  if (!unifiedId.startsWith('mec_')) return null;

  const supabase = await createSupabaseServerClient();
  const courseId = unifiedId.replace('mec_', '');

  const { data: opps, error: oppsErr } = await supabase
    .from('opportunities')
    .select('id, year, semester')
    .eq('course_id', courseId)
    .eq('opportunity_type', 'sisu');

  if (oppsErr || !opps || opps.length === 0) return null;

  const oppIds = opps.map((o) => o.id);

  const { data, error } = await supabase
    .from('opportunities_sisu_approvals')
    .select(
      'opportunity_id, tipo_concorrencia, modalidade_concorrencia, qt_aprovados, nota_minima, nota_maxima, nota_media',
    )
    .in('opportunity_id', oppIds)
    .order('qt_aprovados', { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Filter to only include the latest cycle that has approvals
  const approvalsWithCycle = data.map(app => {
    const opp = opps.find(o => o.id === app.opportunity_id);
    return { ...app, year: opp?.year || 0, semester: opp?.semester || '' };
  });

  let maxYear = 0;
  let maxSemester = '';
  for (const app of approvalsWithCycle) {
    if (app.year > maxYear || (app.year === maxYear && app.semester > maxSemester)) {
      maxYear = app.year;
      maxSemester = app.semester;
    }
  }

  const latestApprovals = approvalsWithCycle.filter(app => app.year === maxYear && app.semester === maxSemester);
  return latestApprovals as ApprovalRow[];
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const unifiedId = decodeURIComponent(id);
  const [opportunity, relatedOpportunities, approvalStats] = await Promise.all([
    getOpportunity(unifiedId),
    getRelatedOpportunities(unifiedId),
    getApprovalStats(unifiedId),
  ]);

  if (!opportunity) {
    notFound();
  }

  return (
    <AppShell>
      <RequireAuth />
      <DetailsLayout
        opportunity={opportunity}
        relatedOpportunities={relatedOpportunities}
        approvalStats={approvalStats}
      />
    </AppShell>
  );
}
