// Service: getUnifiedOpportunities
// Queries the v_unified_opportunities Postgres view via Supabase.
// Uses createServerClient from @supabase/ssr — MUST be called from a Server Component
// or Server Action, never from a Client Component (PLAYBOOK § 2).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { IUnifiedOpportunity, OpportunityCategory, OpportunitySourceType } from '@/types/opportunities';

// Row shape returned by v_unified_opportunities — maps directly to view columns
interface UnifiedOpportunityRow {
  unified_id: string;
  title: string;
  provider_name: string;
  type: string;
  category: string;
  is_partner: boolean;
  location: string;
  badges: string[];
  opportunity_type: string;
  created_at: string;
  external_redirect_url: string | null;
  external_redirect_enabled: boolean;
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
    opportunity_type: row.opportunity_type,
    category,
    category_label:   CATEGORY_LABELS[category] ?? row.category,
    location:         row.location,
    education_level:  'Graduação', // MEC data is always undergraduate; partners override client-side if needed
    badges:           Array.isArray(row.badges) ? row.badges.filter(Boolean) : [],
    created_at:       row.created_at,
    external_redirect: row.external_redirect_url != null || row.external_redirect_enabled
      ? {
          enabled: row.external_redirect_enabled,
          url:     row.external_redirect_url ?? undefined,
        }
      : undefined,
  };
}

interface GetUnifiedOpportunitiesOptions {
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

  let query = supabase
    .from('v_unified_opportunities')
    .select('*')
    .range(page * limit, page * limit + limit - 1);

  // Sempre ordena por recência via PostgREST (compatível com qualquer view)
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    // Fail Fast, Fail Loud (PLAYBOOK § 1) — do not swallow database errors
    throw new Error(`getUnifiedOpportunities failed [mode=${mode}]: ${error.message}`);
  }

  const mapped = (data as UnifiedOpportunityRow[]).map(mapRowToOpportunity);

  if (mode === 'para-voce') {
    // In-memory sort: parceiras primeiro, depois por recência
    // Evita dependência de is_partner ser sortável via PostgREST na view
    mapped.sort((a, b) => Number(b.is_partner) - Number(a.is_partner));
  }

  return mapped;
}
