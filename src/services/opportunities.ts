// Service: getUnifiedOpportunities
// Queries the v_unified_opportunities Postgres view via Supabase.
// Uses createServerClient from @supabase/ssr — MUST be called from a Server Component
// or Server Action, never from a Client Component (PLAYBOOK § 2).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { IUnifiedOpportunity, OpportunityCategory, OpportunitySourceType } from '@/types/opportunities';

// Row shape returned by v_unified_opportunities — maps directly to view columns
// Sprint 6: added status, starts_at, ends_at. 'type' is the source type (sisu|prouni|partner).
interface UnifiedOpportunityRow {
  unified_id: string;
  title: string;
  provider_name: string;
  type: string;                       // 'sisu' | 'prouni' | 'partner'
  opportunity_type: string;           // 'programa de bolsa'|'programa educacional' for partners; 'sisu'|'prouni' for MEC
  category: string;
  is_partner: boolean;
  location: string;
  badges: string[];
  created_at: string;
  external_redirect_url: string | null;
  external_redirect_enabled: boolean;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  match_score?: number;
  min_cutoff_score_current?: number;
  min_cutoff_score_prev?: number;
  max_cutoff_score_current?: number;
  max_cutoff_score_prev?: number;
  nu_media_minima_enem_current?: number;
  nu_media_minima_enem_prev?: number;
  vagas_ociosas_current?: boolean;
  vagas_ociosas_prev?: boolean;
  institution_cover_url?: string;
}

// Category label lookup — keeps the service layer free of display-layer concerns
const CATEGORY_LABELS: Record<string, string> = {
  public_universities:    'Universidades Públicas',
  grants_scholarships:    'Bolsas e Gratuidades',
  educational_programs:   'Programas Educacionais',
};

function mapRowToOpportunity(row: UnifiedOpportunityRow): IUnifiedOpportunity {
  const category = row.category as OpportunityCategory;
  return {
    id:               row.unified_id,
    title:            row.title,
    institution_name: row.provider_name,
    is_partner:       row.is_partner,
    type:             row.type as OpportunitySourceType,
    // Use the actual subtype from the view, fallback to 'type'
    opportunity_type: row.opportunity_type || row.type,
    category,
    category_label:   CATEGORY_LABELS[category] ?? row.category,
    location:         row.location,
    education_level:  'Graduação', // MEC data is always undergraduate
    badges:           Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
    created_at:       row.created_at,
    // Sprint 6: lifecycle dates and status
    status:           row.status ?? undefined,
    starts_at:        row.starts_at ?? undefined,
    ends_at:          row.ends_at ?? undefined,
    external_redirect: row.external_redirect_url != null || row.external_redirect_enabled
      ? {
          enabled: row.external_redirect_enabled,
          url:     row.external_redirect_url ?? undefined,
        }
      : undefined,
    match_score:      row.match_score,
    min_cutoff_score_current: row.min_cutoff_score_current,
    min_cutoff_score_prev: row.min_cutoff_score_prev,
    max_cutoff_score_current: row.max_cutoff_score_current,
    max_cutoff_score_prev: row.max_cutoff_score_prev,
    nu_media_minima_enem_current: row.nu_media_minima_enem_current,
    nu_media_minima_enem_prev: row.nu_media_minima_enem_prev,
    vagas_ociosas_current: row.vagas_ociosas_current,
    vagas_ociosas_prev: row.vagas_ociosas_prev,
    institution_cover_url: row.institution_cover_url,
  };
}

interface GetUnifiedOpportunitiesOptions extends Partial<import('@/types/opportunities').ExploreFilters> {
  mode:        'para-voce' | 'explorar';
  page?:       number;
  limit?:      number;
  profileId?:  string; // activeProfileId do client — override do user.id para multi-perfil
}

/**
 * Fetches unified opportunities from v_unified_opportunities view.
 * - "para-voce" mode: partners first, then by recency (is_partner DESC, created_at DESC)
 * - "explorar" mode: pure recency (created_at DESC)
 *
 * Must be called from a Server Component or Server Action.
 * @throws Error if Supabase query fails (Fail Fast — PLAYBOOK § 1)
 */
/**
 * Dynamically resolves MEC opportunities status/redirect from programs table
 */
async function enrichMecOpportunities(
  opportunities: IUnifiedOpportunity[],
  supabase: any,
): Promise<IUnifiedOpportunity[]> {
  const mecOpps = opportunities.filter(opp => !opp.is_partner);
  if (mecOpps.length === 0) return opportunities;

  // 1. Fetch cycle info for these courses to get their exact year and semester
  const courseIds = mecOpps.map(opp => opp.id.replace('mec_', ''));
  const { data: courseCycles, error: cyclesError } = await supabase
    .from('opportunities')
    .select('course_id, year, semester, opportunity_type, courses(degree_type)')
    .in('course_id', courseIds);

  if (cyclesError) {
    console.error('[enrichMecOpportunities] Failed to fetch course cycles:', cyclesError.message);
    return opportunities;
  }

  const latestCycleMap = new Map<string, { year: number; semester: string; type: string; degree_type?: string }>();
  if (courseCycles) {
    for (const row of courseCycles) {
      const existing = latestCycleMap.get(row.course_id);
      const currentYear = row.year;
      const currentSem = row.semester || '1';
      const dt = row.courses?.degree_type;
      if (!existing || currentYear > existing.year || (currentYear === existing.year && currentSem > existing.semester)) {
        latestCycleMap.set(row.course_id, { year: currentYear, semester: currentSem, type: row.opportunity_type, degree_type: dt });
      }
    }
  }

  // 2. Fetch all programs
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('type, cycle_year, cycle_semester, status, redirect_url, starts_at, ends_at');

  if (programsError) {
    console.error('[enrichMecOpportunities] Failed to fetch programs:', programsError.message);
    return opportunities;
  }

  if (programs && programs.length > 0) {
    const programMap = new Map<string, any>();
    for (const prog of programs) {
      const key = `${prog.type.toLowerCase()}|${prog.cycle_year}|${prog.cycle_semester}`;
      programMap.set(key, prog);
    }

    opportunities.forEach(opp => {
      if (!opp.is_partner) {
        const cid = opp.id.replace('mec_', '');
        const cycle = latestCycleMap.get(cid);
        if (cycle) {
          const key = `${cycle.type.toLowerCase()}|${cycle.year}|${cycle.semester}`;
          const prog = programMap.get(key);
          if (prog) {
            opp.status = prog.status;
            opp.starts_at = prog.starts_at ?? undefined;
            opp.ends_at = prog.ends_at ?? undefined;
            if (prog.redirect_url) {
              opp.external_redirect = {
                enabled: true,
                url: prog.redirect_url
              };
            }
          }
          if (cycle.degree_type) {
            const dt = cycle.degree_type.toLowerCase();
            if (dt.includes('bacharelado')) opp.education_level = 'Bacharelado';
            else if (dt.includes('licenciatura')) opp.education_level = 'Licenciatura';
            else if (dt.includes('tecnol')) opp.education_level = 'Tecnológico';
            else opp.education_level = cycle.degree_type;
          }
        }
      }
    });
  }

  return opportunities;
}

export async function getAvailableCategories(): Promise<string[]> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const [bolsaRes, educRes, prouniRes, sisuRes] = await Promise.all([
    supabase.from('v_unified_opportunities').select('unified_id').eq('opportunity_type', 'programa de bolsa').limit(1),
    supabase.from('v_unified_opportunities').select('unified_id').eq('opportunity_type', 'programa educacional').limit(1),
    supabase.from('v_unified_opportunities').select('unified_id').eq('type', 'prouni').limit(1),
    supabase.from('v_unified_opportunities').select('unified_id').eq('type', 'sisu').limit(1),
  ]);

  const available: string[] = [];
  if (bolsaRes.data && bolsaRes.data.length > 0) available.push('programa de bolsa');
  if (educRes.data && educRes.data.length > 0) available.push('programa educacional');
  if (prouniRes.data && prouniRes.data.length > 0) available.push('prouni');
  if (sisuRes.data && sisuRes.data.length > 0) available.push('sisu');

  return available;
}

export async function getUnifiedOpportunities(
  options: GetUnifiedOpportunitiesOptions,
): Promise<IUnifiedOpportunity[]> {
  const { mode, page = 0, limit = 20 } = options;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // Server Components cannot set cookies — setAll is a no-op here
        setAll: () => {},
      },
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => fetch(url, { ...init, cache: 'no-store' }),
      },
    },
  );

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  // For explorar mode, try to fetch user coordinates to order by distance
  let userLat: number | null = null;
  let userLong: number | null = null;
  
  if (mode === 'explorar' && user) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('device_latitude, device_longitude')
      .eq('user_id', user.id)
      .single();
      
    if (prefs?.device_latitude && prefs?.device_longitude) {
      userLat = prefs.device_latitude;
      userLong = prefs.device_longitude;
    }
  }

  if (mode === 'para-voce') {
    if (user) {
      // Prioridade: profileId explícito → cookie nubo:active_profile_id → auth user.id
      const cookieProfileId = cookieStore.get('nubo:active_profile_id')?.value;
      const resolvedProfileId = options.profileId ?? cookieProfileId ?? user.id;
      const { data, error } = await supabase.rpc('get_opportunities_for_user', {
        p_profile_id: resolvedProfileId,
        p_page: page,
        p_limit: limit,
      });
      
      if (!error && data) {
        const mapped = (data as UnifiedOpportunityRow[]).map(mapRowToOpportunity);
        return await enrichMecOpportunities(mapped, supabase);
      }
      // If RPC doesn't exist yet or fails, fall through to view-based query below
      console.warn('[opportunities] get_opportunities_for_user unavailable, using view fallback:', error?.message);
    }
  }

  // Fallback para explorar ou usuário não autenticado no modo para-voce
  let query;
  if (mode === 'explorar' && userLat !== null && userLong !== null) {
    // Dynamic query fetching the view AND calculating distance using the user coordinates
    query = supabase
      .rpc('get_unified_opportunities_by_distance', { p_lat: userLat, p_long: userLong })
      .select('*');
  } else {
    query = supabase
      .from('v_unified_opportunities')
      .select('*');
  }

  // Filtros de Explorar (Sprint 2.5 + Hotfix)
  if (options.q) {
    const unaccentedQ = options.q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = `%${unaccentedQ}%`;
    query = query.ilike('search_text', term);
  }
  if (options.category === 'programa de bolsa' || options.category === 'programa educacional') {
    query = query.eq('opportunity_type', options.category);
  } else if (options.category) {
    query = query.eq('type', options.category);
  }
  

  if (options.location && options.location !== '') {
    query = query.ilike('location', `%${options.location}%`);
  }

  if (options.city && options.city !== '') {
    query = query.ilike('location', `%${options.city}%`);
  }

  if (options.shifts && options.shifts.length > 0) {
    // badges is jsonb — use @> (cs) per value, combined with OR
    // EaD has a synonym "Curso a distância" in MEC data
    const shiftValues = options.shifts.flatMap(s =>
      s === 'EaD' ? ['EaD', 'Curso a distância'] : [s]
    );
    const orClause = shiftValues
      .map(s => `computed_badges.cs.${JSON.stringify([s])}`)
      .join(',');
    query = query.or(orClause);
  }

  if (options.quota_types && options.quota_types.length > 0) {
    const quotaClause = options.quota_types
      .map(q => `computed_badges.cs.${JSON.stringify([q])}`)
      .join(',');
    query = query.or(quotaClause);
  }

  if (options.program_preference) {
    if (options.program_preference === 'sisu' || options.program_preference === 'prouni') {
      query = query.eq('type', options.program_preference);
    } else if (options.program_preference === 'programa de bolsa') {
      query = query.eq('opportunity_type', 'programa de bolsa');
    }
  }

  // Prevent impossible queries (e.g. sisu + privada)
  if (options.university_preference === 'publica') {
    query = query.eq('is_partner', false);
  } else if (options.university_preference === 'privada') {
    // Only apply 'privada' if we aren't explicitly requesting a public program
    if (options.program_preference !== 'sisu' && options.program_preference !== 'prouni') {
      query = query.eq('is_partner', true);
    }
  }

  if (options.course_interests && options.course_interests.length > 0) {
    const orClause = options.course_interests
      .map(ci => `title.ilike.%${ci}%`)
      .join(',');
    query = query.or(orClause);
  }

  // Ordenação
  if (mode === 'explorar' && userLat !== null && userLong !== null) {
    // Prioritizes Partners first, then distance_km (ascending - closest first), then creation date
    query = query
      .order('is_partner', { ascending: false })
      .order('distance_km', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
  } else {
    // Sempre ordena por recência via PostgREST (compatível com qualquer view)
    query = query.order('created_at', { ascending: false });
  }

  // Paginação
  query = query.range(page * limit, (page + 1) * limit - 1);

  const { data, error } = await query;

  if (error) {
    // Fail Fast, Fail Loud (PLAYBOOK § 1) — do not swallow database errors
    throw new Error(`getUnifiedOpportunities failed [mode=${mode}]: ${error.message}`);
  }

  const mapped = (data as UnifiedOpportunityRow[]).map(mapRowToOpportunity);

  const enriched = await enrichMecOpportunities(mapped, supabase);

  // If user is authenticated, we want to fetch the match scores for these opportunities 
  // so the Explore tab can also show the match badge.
  if (user && enriched.length > 0) {
    const unifiedIds = enriched.map(opp => opp.id);
    const { data: matchData } = await supabase
      .from('user_opportunity_matches')
      .select('unified_opportunity_id, match_score')
      .eq('profile_id', user.id)
      .in('unified_opportunity_id', unifiedIds);

    if (matchData) {
      const matchMap = new Map(matchData.map((m: any) => [m.unified_opportunity_id, m.match_score]));
      enriched.forEach(opp => {
        const score = matchMap.get(opp.id);
        if (score !== undefined) {
          opp.match_score = score;
        }
      });
    }
  }

  if (mode === 'para-voce') {
    // In-memory sort: parceiras primeiro, depois por recência (apenas para não-logados)
    enriched.sort((a, b) => Number(b.is_partner) - Number(a.is_partner));
  }

  return enriched;
}
