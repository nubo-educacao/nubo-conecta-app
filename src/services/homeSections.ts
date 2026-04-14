/**
 * Service para buscar seções dinâmicas da Home do banco (home_sections).
 *
 * Substitui as queries hardcoded de page.tsx, permitindo configuração
 * via Admin CMS (/app-cms).
 */

import { createClient } from '@/lib/supabase';

export interface IHomeSection {
  id: string;
  title: string;
  section_type: 'opportunity_carousel' | 'institution_carousel' | 'match_carousel' | 'dates' | 'hero_search' | 'dynamic_cta';
  data_source: 'partner_opportunities' | 'recent_opportunities' | 'match_results' | 'institutions' | 'important_dates' | 'static';
  display_order: number;
  is_active: boolean;
  target_states: string[] | null;
  target_onboarding_status: string | null;
  config: Record<string, unknown>;
}

/**
 * Busca as seções ativas da Home ordenadas por display_order.
 *
 * @param userState - Sigla do estado do usuário (ex: 'SP'). Se fornecido,
 *                    filtra seções com target_states que não incluam o estado.
 *                    Se null/undefined, mostra apenas seções sem filtro de estado.
 */
export async function getHomeSections(userState?: string | null): Promise<IHomeSection[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[Home CMS] Erro ao buscar seções:', error);
    return [];
  }

  const sections = (data ?? []) as IHomeSection[];

  // Filtro client-side por target_states
  return sections.filter((section) => {
    if (!section.target_states || section.target_states.length === 0) {
      return true; // Sem restrição de estado → exibir para todos
    }
    if (!userState) {
      return false; // Seção restrita, mas usuário sem estado → não exibir
    }
    return section.target_states.includes(userState);
  });
}
