// Opportunities Page — Sprint 2.5
// Server Component: fetches unified opportunities data server-side.
// Tab + filters controlled via searchParams for SSR-safe re-renders and URL shareability.
// Figma tokens for SwitchPill (node 22:1160):
//   Container:    bg-[#f3f4f6] h-[47px] rounded-full w-full
//   Aba ativa:    bg-[#3092bb] rounded-full shadow-[0px_4px_6px_...] h-[39px]
//   Texto ativo:  text-white font-semibold text-[13px] (Montserrat SemiBold)
//   Texto inativo: text-[#636e7c] font-semibold text-[13px]

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AppShell from '@/components/layout/AppShell';
import { getUnifiedOpportunities, getAvailableCategories } from '@/services/opportunities';
import OpportunitiesClient from './OpportunitiesClient';
import type { ExploreFilters } from '@/types/opportunities';

const PAGE_SIZE = 15;

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
    shifts?: string;
    quota_types?: string;
    course_interests?: string;
    program_preference?: string;
    university_preference?: string;
    city?: string;
    page?: string;
  }>;
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Derivar tab ativo: ?tab= tem prioridade sobre legado ?mode=
  const activeTab: 'para-voce' | 'explore' =
    params.tab === 'explore' || params.mode === 'explorar' ? 'explore' : 'para-voce';

  const currentPage = Math.max(0, parseInt(params.page ?? '0') || 0);

  const filters: ExploreFilters = {
    q:        params.q,
    category: params.category,
    modality: params.modality === 'presential' || params.modality === 'online'
      ? params.modality
      : undefined,
    location:             params.location,
    shifts:               params.shifts ? params.shifts.split(',').filter(Boolean) : undefined,
    quota_types:          params.quota_types ? params.quota_types.split(',').filter(Boolean) : undefined,
    course_interests:     params.course_interests ? params.course_interests.split(',').filter(Boolean) : undefined,
    program_preference:    params.program_preference || undefined,
    university_preference: params.university_preference || undefined,
    city:                  params.city || undefined,
  };

  // Server-side fetch com paginação de 15 itens
  const [opportunities, availableCategories] = await Promise.all([
    getUnifiedOpportunities({ 
      mode: activeTab === 'explore' ? 'explorar' : 'para-voce', 
      page: currentPage, 
      limit: PAGE_SIZE,
      ...filters
    }),
    getAvailableCategories(),
  ]);

  return (
    <AppShell>
      <OpportunitiesClient
        opportunities={opportunities}
        activeTab={activeTab}
        filters={filters}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        availableCategories={availableCategories}
      />
    </AppShell>
  );
}
