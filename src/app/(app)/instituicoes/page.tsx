// Institutions Page — Sprint 8.0
// Lista unificada: parceiras + MEC via v_unified_institutions.
// Server Component: fetch → InstitutionsClient (filtros + search agora via URL params).

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AppShell from '@/components/layout/AppShell';
import { getUnifiedInstitutions } from '@/services/institutions';
import InstitutionsClient from './InstitutionsClient';

const PAGE_SIZE = 15;

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function InstitutionsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const activeTab = (params.tab === 'partner' || params.tab === 'other') 
    ? params.tab 
    : 'all';
  
  const currentPage = Math.max(0, parseInt(params.page ?? '0') || 0);
  const searchQuery = params.q || '';

  const { data: institutions, count } = await getUnifiedInstitutions({
    page: currentPage,
    limit: PAGE_SIZE,
    type: activeTab as 'all' | 'partner' | 'other',
    q: searchQuery
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1
            className="font-bold text-[20px]"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Instituições
          </h1>
          <p
            className="font-normal text-[13px]"
            style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
          >
            Conheça as instituições e suas oportunidades
          </p>
        </div>

        <InstitutionsClient 
          institutions={institutions} 
          totalCount={count}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          activeTab={activeTab as any}
          searchQuery={searchQuery}
        />
      </div>
    </AppShell>
  );
}
