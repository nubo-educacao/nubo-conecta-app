// institutions.ts — Sprint 8.0
// Busca instituições via v_unified_institutions (parceiras + MEC).
// getPartnerInstitutions mantido para retrocompat com InstitutionCarousel.
// Server-side via createServerClient (@supabase/ssr).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { UnifiedInstitution } from '@/types/institutions';

export interface IPartnerInstitution {
  id: string;
  name: string;
  location: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  brand_color: string | null;
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
    .from('institutions')
    .select(`
      id,
      name,
      partner_institutions (
        logo_url,
        cover_url,
        description,
        brand_color,
        location
      )
    `)
    .eq('is_partner', true)
    .order('name', { ascending: true })
    .limit(12);

  if (error) {
    throw new Error(`getPartnerInstitutions failed: ${error.message} (code: ${error.code})`);
  }

  if (!data) return [];

  return (data as any[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    location:    row.partner_institutions?.location ?? '',
    logo_url:    row.partner_institutions?.logo_url ?? null,
    cover_url:   row.partner_institutions?.cover_url ?? null,
    description: row.partner_institutions?.description ?? null,
    brand_color: row.partner_institutions?.brand_color ?? null,
  }));
}

// ─── Unified Institutions (Sprint 8.0) ───────────────────────────────────────

export async function getUnifiedInstitutions(): Promise<UnifiedInstitution[]> {
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
    .select('id, name, location, logo_url, cover_url, brand_color, description, type')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`getUnifiedInstitutions failed: ${error.message} (code: ${error.code})`);
  }

  return (data ?? []) as UnifiedInstitution[];
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
    .select('id, name, location, logo_url, cover_url, brand_color, description, type')
    .eq('id', id)
    .limit(1);

  if (error) return null;
  return (data && data.length > 0) ? (data[0] as UnifiedInstitution) : null;
}
