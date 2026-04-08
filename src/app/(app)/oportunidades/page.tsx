// Opportunities Page — Sprint 2.5
// Server Component: fetches unified opportunities data server-side.
// Tab + filters controlled via searchParams for SSR-safe re-renders and URL shareability.
// Figma tokens for SwitchPill (node 22:1160):
//   Container:    bg-[#f3f4f6] h-[47px] rounded-full w-full
//   Aba ativa:    bg-[#3092bb] rounded-full shadow-[0px_4px_6px_...] h-[39px]
//   Texto ativo:  text-white font-semibold text-[13px] (Montserrat SemiBold)
//   Texto inativo: text-[#636e7c] font-semibold text-[13px]

import AppShell from '@/components/layout/AppShell';
import { getUnifiedOpportunities } from '@/services/opportunities';
import OpportunitiesClient from './OpportunitiesClient';
import type { ExploreFilters } from '@/types/opportunities';

interface PageProps {
  searchParams: Promise<{
    // legado Sprint 02 — mantido para compatibilidade
    mode?: string;
    // Sprint 2.5 — parâmetros canônicos
    tab?: string;
    q?: string;
    category?: string;
    modality?: string;
    location?: string;
  }>;
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Derivar tab ativo: ?tab= tem prioridade sobre legado ?mode=
  const activeTab: 'para-voce' | 'explore' =
    params.tab === 'explore' || params.mode === 'explorar' ? 'explore' : 'para-voce';

  const filters: ExploreFilters = {
    q:        params.q,
    category: params.category,
    modality: params.modality === 'presential' || params.modality === 'online'
      ? params.modality
      : undefined,
    location: params.location,
  };

  // Server-side fetch — fails loud if DB is down (PLAYBOOK § 1)
  const opportunities = await getUnifiedOpportunities({ mode: activeTab === 'explore' ? 'explorar' : 'para-voce', page: 0, limit: 30 });

  return (
    <AppShell>
      <OpportunitiesClient
        opportunities={opportunities}
        activeTab={activeTab}
        filters={filters}
      />
    </AppShell>
  );
}
