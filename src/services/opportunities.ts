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
  opportunity_type: string;           // specific subtype (e.g. 'bolsa')
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
  min_cutoff_score?: number;
  max_cutoff_score?: number;
  institution_cover_url?: string;
}

// Category label lookup — keeps the service layer free of display-layer concerns
const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
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
    min_cutoff_score: row.min_cutoff_score,
    max_cutoff_score: row.max_cutoff_score,
    institution_cover_url: row.institution_cover_url,
  };
}

interface GetUnifiedOpportunitiesOptions extends Partial<import('@/types/opportunities').ExploreFilters> {
  mode:   'para-voce' | 'explorar';
  page?:  number;
  limit?: number;
}

/**
 * Fetches unified opportunities from v_unified_opportunities view.
 * - "para-voce" mode: partners first, then by recency (is_partner DESC, created_at DESC)
 * - "explorar" mode: pure recency (created_at DESC)
 *
 * Must be called from a Server Component or Server Action.
 * @throws Error if Supabase query fails (Fail Fast — PLAYBOOK § 1)
 */
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
    },
  );

  if (mode === 'para-voce') {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Try the personalized RPC — falls back to view if not yet deployed
      const { data, error } = await supabase.rpc('get_opportunities_for_user', {
        p_profile_id: user.id,
        p_page: page,
        p_limit: limit,
      });
      
      if (!error && data) {
        return (data as UnifiedOpportunityRow[]).map(mapRowToOpportunity);
      }
      // If RPC doesn't exist yet or fails, fall through to view-based query below
      console.warn('[opportunities] get_opportunities_for_user unavailable, using view fallback:', error?.message);
    }
  }

  // Fallback para explorar ou usuário não autenticado no modo para-voce
  let query = supabase
    .from('v_unified_opportunities')
    .select('*')
    .range(page * limit, (page + 1) * limit - 1);

  // Filtros de Explorar (Sprint 2.5 + Hotfix)
  if (options.q) {
    query = query.ilike('title', `%${options.q}%`);
  }
  if (options.category === 'bolsa-integral') {
    query = query.eq('opportunity_type', 'prouni'); // Simplificação para o catálogo
  } else if (options.category) {
    query = query.eq('type', options.category);
  }
  

  if (options.location && options.location !== '') {
    query = query.ilike('location', `%${options.location}%`);
  }

  if (options.shift && options.shift !== '') {
    if (options.shift === 'EaD') {
      // Para EaD, buscamos os dois sinônimos comuns no banco MEC (EaD e Curso a distância)
      query = query.filter('badges', 'ov', JSON.stringify(['EaD', 'Curso a distância']));
    } else {
      query = query.filter('badges', 'cs', JSON.stringify([options.shift]));
    }
  }

  if (options.min_igc) {
    // institution_igc na view é text, precisamos converter ou filtrar via PostgREST gte
    query = query.gte('institution_igc', options.min_igc.toString());
  }

  if (options.price_range === 'free') {
    query = query.eq('is_partner', false);
  } else if (options.price_range === 'paid') {
    query = query.eq('is_partner', true);
  }

  // Sempre ordena por recência via PostgREST (compatível com qualquer view)
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    // Fail Fast, Fail Loud (PLAYBOOK § 1) — do not swallow database errors
    throw new Error(`getUnifiedOpportunities failed [mode=${mode}]: ${error.message}`);
  }

  const mapped = (data as UnifiedOpportunityRow[]).map(mapRowToOpportunity);

  if (mode === 'para-voce') {
    // In-memory sort: parceiras primeiro, depois por recência (apenas para não-logados)
    mapped.sort((a, b) => Number(b.is_partner) - Number(a.is_partner));
  }

  return mapped;
}
