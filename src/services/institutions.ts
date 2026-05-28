// institutions.ts — Sprint 8.0
// Busca instituições via v_unified_institutions (parceiras + MEC).
// getPartnerInstitutions mantido para retrocompat com InstitutionCarousel.
// Server-side via createServerClient (@supabase/ssr).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { UnifiedInstitution } from '@/types/institutions';

export interface IPartnerInstitution extends UnifiedInstitution {
  type: 'partner';
}

export async function getPartnerInstitutions(): Promise<IPartnerInstitution[]> {
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

  const { data, error } = await supabase
    .from('v_unified_institutions')
    .select('id, name, location, logo_url, cover_url, brand_color, description, type, opp_types')
    .eq('type', 'partner')
    .order('name', { ascending: true })
    .limit(12);

  if (error) {
    throw new Error(`getPartnerInstitutions failed: ${error.message} (code: ${error.code})`);
  }

  if (!data) return [];

  return (data as any[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    location:    row.location ?? '',
    logo_url:    row.logo_url ?? null,
    cover_url:   row.cover_url ?? null,
    description: row.description ?? null,
    brand_color: row.brand_color ?? null,
    type:        'partner' as const,
    opp_types:   row.opp_types ?? null,
  }));
}

// ─── Unified Institutions (Sprint 8.0) ───────────────────────────────────────

export interface InstitutionsFilters {
  page?: number;
  limit?: number;
  type?: 'all' | 'partner' | 'other';
  q?: string;
}

export async function getUnifiedInstitutions(filters: InstitutionsFilters = {}): Promise<{ data: UnifiedInstitution[], count: number }> {
  const { page = 0, limit = 15, type = 'all', q } = filters;
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

  let queryBuilder = supabase
    .from('v_unified_institutions')
    .select('id, name, location, logo_url, cover_url, brand_color, description, type, opp_types, acronym, academic_organization, administrative_category, website_url', { count: 'exact' });

  // Apply Filters
  if (type === 'partner') {
    queryBuilder = queryBuilder.eq('type', 'partner');
  } else if (type === 'other') {
    queryBuilder = queryBuilder.eq('type', 'mec');
  }

  if (q) {
    const searchFilter = `name.ilike.%${q}%,location.ilike.%${q}%,acronym.ilike.%${q}%`;
    queryBuilder = queryBuilder.or(searchFilter);
  }

  // Execute Data Query
  queryBuilder = queryBuilder
    .order('type', { ascending: true })
    .order('name', { ascending: true })
    .range(page * limit, (page + 1) * limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw new Error(`getUnifiedInstitutions failed: ${error.message}`);
  }

  return {
    data: (data || []) as UnifiedInstitution[],
    count: count || 0
  };
}

export async function getUnifiedInstitutionById(id: string): Promise<UnifiedInstitution | null> {
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

  const { data, error } = await supabase
    .from('v_unified_institutions')
    .select('id, name, location, logo_url, cover_url, brand_color, description, type, opp_types, acronym, academic_organization, administrative_category, website_url')
    .eq('id', id)
    .limit(1);

  if (error) return null;
  return (data && data.length > 0) ? (data[0] as UnifiedInstitution) : null;
}
