// availableCategories — client-side helper compartilhado (HeroSearch + MatchOnboardingForm)
// Mesma semântica do getAvailableCategories server-side (services/opportunities.ts):
// v_unified_opportunities só contém programas com status <> 'inactive', então a presença
// de ao menos 1 linha por tipo determina se a opção deve ser exibida.
// Ordem de prioridade do produto: Sisu, Prouni, depois opções de parceiros.

import { supabase } from '@/lib/supabase';

export interface AvailableCategory {
  value: string;
  label: string;
}

const CATEGORY_ORDER: { value: string; label: string; column: 'type' | 'opportunity_type' }[] = [
  { value: 'sisu', label: 'Sisu', column: 'type' },
  { value: 'prouni', label: 'Prouni', column: 'type' },
  { value: 'programa de bolsa', label: 'Programa de Bolsa', column: 'opportunity_type' },
  { value: 'programa educacional', label: 'Programas Educacionais', column: 'opportunity_type' },
];

export async function fetchAvailableCategories(): Promise<AvailableCategory[]> {
  const results = await Promise.all(
    CATEGORY_ORDER.map(o =>
      supabase.from('v_unified_opportunities').select('unified_id').eq(o.column, o.value).limit(1),
    ),
  );

  return CATEGORY_ORDER
    .filter((_, i) => (results[i].data?.length ?? 0) > 0)
    .map(({ value, label }) => ({ value, label }));
}
