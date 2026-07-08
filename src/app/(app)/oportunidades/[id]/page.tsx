// Opportunity Detail Page — Sprint 7.0 Enrichment
// Server Component — fetches single opportunity from enriched v_unified_opportunities.
// Decomposed into DetailsLayout for maintainability and pixel-perfect Figma parity.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => fetch(url, { ...init, cache: 'no-store' }),
      },
    },
  );
}

/**
 * getOpportunity - Fetches enriched metadata from the unified view
 * Hydrates match_score from user_opportunity_matches if a session exists.
 */
interface BestMatchInfo {
  bestOpportunityId?: string;   // opportunities.id (uuid) da melhor modalidade eleita pelo motor
  bestIsCota?: boolean;         // true se o score veio com cota_bonus (destaca a linha Cotas no ProUni)
}

async function getOpportunity(unifiedId: string): Promise<[IUnifiedOpportunity, string | undefined, BestMatchInfo] | null> {
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
  let bestConcurrencyType: string | undefined = undefined;
  const bestMatch: BestMatchInfo = {};
  if (user) {
    const { data: matchData } = await supabase
      .from('user_opportunity_matches')
      .select('match_score, match_details')
      .eq('unified_opportunity_id', unifiedId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (matchData) {
      matchScore = matchData.match_score;
      const details = matchData.match_details as any;
      bestConcurrencyType = details?.best_concurrency_type ?? undefined;
      bestMatch.bestOpportunityId = details?.best_opportunity_id ?? undefined;
      bestMatch.bestIsCota = details?.cota_bonus_applied === true;
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
  } else {
    let programType = oppData.type;
    
    let latestOpportunity = null;
    if (unifiedId.startsWith('mec_')) {
      const courseId = unifiedId.replace('mec_', '');
      const { data } = await supabase
        .from('opportunities')
        .select('opportunity_type, year, semester')
        .eq('course_id', courseId)
        .order('year', { ascending: false })
        .order('semester', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        latestOpportunity = data;
        programType = data.opportunity_type;
      }
    }

    let programQuery = supabase
      .from('programs')
      .select('status, redirect_url, starts_at, ends_at, prev_program_id')
      .eq('type', programType);

    if (latestOpportunity && latestOpportunity.year) {
      programQuery = programQuery
        .eq('cycle_year', latestOpportunity.year)
        .eq('cycle_semester', latestOpportunity.semester || '1');
    } else {
      programQuery = programQuery
        .order('cycle_year', { ascending: false })
        .order('cycle_semester', { ascending: false })
        .limit(1);
    }

    const { data: programData, error: programError } = await programQuery.maybeSingle();

    if (programError) {
      console.error('[getOpportunity] Failed to fetch program status:', programError.message);
    }

    if (programData) {
      oppData.status = programData.status;
      oppData.starts_at = programData.starts_at;
      oppData.ends_at = programData.ends_at;
      oppData.external_redirect_url = programData.redirect_url;
      oppData.external_redirect_enabled = !!programData.redirect_url;
      console.log(`[getOpportunity] Enriched ${unifiedId}: status=${programData.status}, redirect=${programData.redirect_url}`);

      // Se o ciclo vigente foi clonado de um ciclo anterior, os dados de vagas ainda
      // refletem aquele ciclo de origem — usado para o rótulo "* Vagas referentes ao Ciclo X.Y".
      if (programData.prev_program_id) {
        const { data: prevProgram } = await supabase
          .from('programs')
          .select('cycle_year, cycle_semester')
          .eq('id', programData.prev_program_id)
          .maybeSingle();
        if (prevProgram) {
          oppData.vacancies_source_cycle = `${prevProgram.cycle_year}.${prevProgram.cycle_semester}`;
        }
      }
    } else {
      console.warn(`[getOpportunity] No program found for ${unifiedId} (type=${programType}). Status remains '${oppData.status}'.`);
    }
  }

  // Fetch degree_type for MEC courses
  let mappedDegree = 'Graduação';
  if (unifiedId.startsWith('mec_')) {
    const courseId = unifiedId.replace('mec_', '');
    const { data: courseData } = await supabase
      .from('courses')
      .select('degree_type')
      .eq('id', courseId)
      .maybeSingle();
      
    if (courseData?.degree_type) {
      const dt = courseData.degree_type.toLowerCase();
      if (dt.includes('bacharelado')) mappedDegree = 'Bacharelado';
      else if (dt.includes('licenciatura')) mappedDegree = 'Licenciatura';
      else if (dt.includes('tecnol')) mappedDegree = 'Tecnológico';
      else mappedDegree = courseData.degree_type;
    }
  }

  return [{
    id:               oppData.unified_id,
    title:            oppData.title,
    institution_name: oppData.provider_name,
    is_partner:       oppData.is_partner,
    type:             oppData.type,
    opportunity_type: oppData.opportunity_type ?? oppData.type,
    category:         oppData.category,
    category_label:   oppData.category === 'educational_programs' ? 'Programas Educacionais' : oppData.category === 'public_universities' ? 'Universidades Públicas' : oppData.category === 'grants_scholarships' ? 'Bolsas e Gratuidades' : oppData.category,
    location:         oppData.location,
    education_level:  mappedDegree,
    badges:           Array.isArray(oppData.badges) ? oppData.badges.filter(Boolean) : [],
    created_at:       oppData.created_at,
    match_score:      matchScore, // Use hydrated score
    status:           oppData.status ?? undefined,
    starts_at:        oppData.starts_at ?? undefined,
    ends_at:          oppData.ends_at ?? undefined,
    external_redirect: oppData.external_redirect_url
      ? { enabled: oppData.external_redirect_enabled || !!oppData.external_redirect_url, url: oppData.external_redirect_url }
      : undefined,
    // Deep Details Metadata
    institution_id:       oppData.institution_id,
    nu_vagas_autorizadas: oppData.nu_vagas_autorizadas,
    qt_vagas_ofertadas_current: oppData.qt_vagas_ofertadas_current,
    qt_vagas_ofertadas_prev: oppData.qt_vagas_ofertadas_prev,
    qt_inscricao_current: oppData.qt_inscricao_current,
    qt_inscricao_prev:    oppData.qt_inscricao_prev,
    vagas_ociosas_current: oppData.vagas_ociosas_current,
    vagas_ociosas_prev:   oppData.vagas_ociosas_prev,
    min_cutoff_score_current: oppData.min_cutoff_score_current,
    min_cutoff_score_prev: oppData.min_cutoff_score_prev,
    max_cutoff_score_current: oppData.max_cutoff_score_current,
    max_cutoff_score_prev: oppData.max_cutoff_score_prev,
    nu_media_minima_enem_current: oppData.nu_media_minima_enem_current,
    nu_media_minima_enem_prev: oppData.nu_media_minima_enem_prev,
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
    vacancies_source_cycle:   oppData.vacancies_source_cycle,
  }, bestConcurrencyType, bestMatch];
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
    let cutoff_score_semester = null;

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
         cutoff_score_semester = pastMatch.semester;
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
      cutoff_score_semester,
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

  // ProUni: o split Ampla/Cotas vive em COLUNAS de opportunities_prouni_vacancies
  // (1 linha por opportunity). Para a lista de opções exibir cada modalidade como
  // linha própria (paridade com o SiSU), explodimos em até 2 linhas — cada uma com
  // suas vagas. As somas agregadas (header Vagas, Métricas) se preservam (X+0 / 0+Y).
  const exploded: Opportunity[] = [];
  for (const item of uniqueRelated) {
    const isProuni = item.opportunity_type?.toLowerCase() === 'prouni';
    const ampla = Number(item.vacancies?.broad_competition_offered) || 0;
    const cota = Number(item.vacancies?.quotas_offered) || 0;

    if (isProuni && ampla > 0 && cota > 0) {
      exploded.push({
        ...item,
        id: `${item.id}_ampla`,
        vacancies: { broad_competition_offered: ampla, quotas_offered: 0 },
      });
      exploded.push({
        ...item,
        id: `${item.id}_cota`,
        vacancies: { broad_competition_offered: 0, quotas_offered: cota },
      });
    } else {
      exploded.push(item);
    }
  }

  return exploded;
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
  const [opportunityResult, relatedOpportunities, approvalStats] = await Promise.all([
    getOpportunity(unifiedId),
    getRelatedOpportunities(unifiedId),
    getApprovalStats(unifiedId),
  ]);

  if (!opportunityResult) {
    notFound();
  }

  const [opportunity, bestConcurrencyType, bestMatch] = opportunityResult;

  return (
    <AppShell>
      <DetailsLayout
        opportunity={opportunity}
        relatedOpportunities={relatedOpportunities}
        approvalStats={approvalStats}
        bestConcurrencyType={bestConcurrencyType}
        bestOpportunityId={bestMatch.bestOpportunityId}
        bestIsCota={bestMatch.bestIsCota}
      />
    </AppShell>
  );
}
