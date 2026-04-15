// Home Dashboard — Sprint 05 CMS Dinâmico
// Server Component: busca seções do CMS e dados de cada seção server-side.
// Fallback para queries hardcoded se home_sections estiver vazio.

import AppShell from '@/components/layout/AppShell';
import HomeClient from './HomeClient';
import { getHomeSections, type IHomeSection } from '@/services/homeSections';
import { getUnifiedOpportunities } from '@/services/opportunities';
import { getImportantDates } from '@/services/importantDates';
import { getPartnerInstitutions } from '@/services/institutions';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import type { IImportantDate } from '@/services/importantDates';
import type { IPartnerInstitution } from '@/services/institutions';

// Tipo expandido para seções com dados já populados
export interface IHomeSectionWithData extends IHomeSection {
  opportunities?: IUnifiedOpportunity[];
  institutions?: IPartnerInstitution[];
  dates?: IImportantDate[];
}

export default async function HomePage() {
  // 1. Buscar seções do CMS
  const sections = await getHomeSections();

  // 2. Se CMS tem seções, buscar dados para cada uma
  if (sections.length > 0) {
    const sectionsWithData = await populateSections(sections);
    return (
      <AppShell>
        <HomeClient sections={sectionsWithData} />
      </AppShell>
    );
  }

  // 3. FALLBACK — queries hardcoded (backward compat enquanto migration não rodou)
  const [recentResult, partnersResult, datesResult, institutionsResult] = await Promise.allSettled([
    getUnifiedOpportunities({ mode: 'explorar', page: 0, limit: 8 }),
    getUnifiedOpportunities({ mode: 'para-voce', page: 0, limit: 8 }),
    getImportantDates(),
    getPartnerInstitutions(),
  ]);

  if (recentResult.status === 'rejected')
    console.error('[Home] ERRO recentes:', recentResult.reason);
  if (partnersResult.status === 'rejected')
    console.error('[Home] ERRO para-voce:', partnersResult.reason);
  if (datesResult.status === 'rejected')
    console.error('[Home] ERRO datas:', datesResult.reason);
  if (institutionsResult.status === 'rejected')
    console.error('[Home] ERRO instituições:', institutionsResult.reason);

  let recentOpportunities: IUnifiedOpportunity[] = [];
  let partnerOpportunities: IUnifiedOpportunity[] = [];
  let importantDates: IImportantDate[] = [];
  let partnerInstitutions: IPartnerInstitution[] = [];

  if (recentResult.status === 'fulfilled') recentOpportunities = recentResult.value;
  if (partnersResult.status === 'fulfilled') partnerOpportunities = partnersResult.value.filter((o) => o.is_partner);
  if (datesResult.status === 'fulfilled') importantDates = datesResult.value;
  if (institutionsResult.status === 'fulfilled') partnerInstitutions = institutionsResult.value;

  // Montar seções do fallback para HomeClient consumir no mesmo formato
  const fallbackSections: IHomeSectionWithData[] = [
    { id: 'fb-hero', title: '', section_type: 'hero_search', data_source: 'static', display_order: 0, is_active: true, target_states: null, target_onboarding_status: null, config: {} },
    { id: 'fb-cta', title: '', section_type: 'dynamic_cta', data_source: 'static', display_order: 1, is_active: true, target_states: null, target_onboarding_status: null, config: {} },
    { id: 'fb-match', title: 'Para Você', section_type: 'match_carousel', data_source: 'match_results', display_order: 2, is_active: true, target_states: null, target_onboarding_status: null, config: { only_authenticated: true } },
    { id: 'fb-partner', title: 'Oportunidades em Destaque', section_type: 'opportunity_carousel', data_source: 'partner_opportunities', display_order: 3, is_active: true, target_states: null, target_onboarding_status: null, config: { see_all_href: '/oportunidades', desktop_grid_mode: true }, opportunities: partnerOpportunities },
    { id: 'fb-recent', title: 'Novidades', section_type: 'opportunity_carousel', data_source: 'recent_opportunities', display_order: 4, is_active: true, target_states: null, target_onboarding_status: null, config: { see_all_href: '/oportunidades?tab=explore' }, opportunities: recentOpportunities },
    { id: 'fb-inst', title: 'Instituições Parceiras', section_type: 'institution_carousel', data_source: 'institutions', display_order: 5, is_active: true, target_states: null, target_onboarding_status: null, config: { see_all_href: '/instituicoes' }, institutions: partnerInstitutions },
    { id: 'fb-dates', title: 'Datas Importantes', section_type: 'dates', data_source: 'important_dates', display_order: 6, is_active: true, target_states: null, target_onboarding_status: null, config: {}, dates: importantDates },
  ];

  return (
    <AppShell>
      <HomeClient sections={fallbackSections} />
    </AppShell>
  );
}

// ─── Helper: popular seções com dados ────────────────────────────────────────
async function populateSections(sections: IHomeSection[]): Promise<IHomeSectionWithData[]> {
  return Promise.all(
    sections.map(async (section): Promise<IHomeSectionWithData> => {
      const limit = (section.config as { limit?: number }).limit ?? 8;
      const enriched: IHomeSectionWithData = { ...section };

      try {
        switch (section.data_source) {
          case 'partner_opportunities': {
            const data = await getUnifiedOpportunities({ mode: 'para-voce', page: 0, limit });
            enriched.opportunities = data.filter((o) => o.is_partner);
            break;
          }
          case 'recent_opportunities': {
            enriched.opportunities = await getUnifiedOpportunities({ mode: 'explorar', page: 0, limit });
            break;
          }
          case 'institutions': {
            enriched.institutions = await getPartnerInstitutions();
            break;
          }
          case 'important_dates': {
            enriched.dates = await getImportantDates();
            break;
          }
          // 'match_results' e 'static' não precisam de data fetch server-side
        }
      } catch (e) {
        console.error(`[Home CMS] Erro ao popular seção "${section.title}":`, e);
      }

      return enriched;
    })
  );
}
