'use client';

// OpportunitiesClient — Sprint 2.5
// Owns SwitchPill tab state and routes between "Para Você" and "Explorar Todas".
// Tab state is serialized to ?tab= via router.replace (no new history entry).
// "Explorar" branch is delegated to ExploreClient (SearchBar + Pills + FilterModal).
// Figma SwitchPill tokens (node 22:1160):
//   Container:     bg-[#f3f4f6] h-[47px] rounded-full w-full
//   Active tab:    bg-[#3092bb] rounded-full shadow-[...] h-[39px]
//   Active text:   text-white font-semibold text-[13px] Montserrat
//   Inactive text: text-[#636e7c] font-semibold text-[13px] Montserrat

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import CardOportunidades from '@/components/opportunities/CardOportunidades';
import CardOportunidadeParceira from '@/components/opportunities/CardOportunidadeParceira';
import ExploreClient from './ExploreClient';
import type { IUnifiedOpportunity, ExploreFilters } from '@/types/opportunities';

interface OpportunitiesClientProps {
  opportunities: IUnifiedOpportunity[];
  activeTab: 'para-voce' | 'explore';
  filters: ExploreFilters;
}

export default function OpportunitiesClient({ opportunities, activeTab, filters }: OpportunitiesClientProps) {
  const router = useRouter();

  const switchTab = (tab: 'para-voce' | 'explore') => {
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24 mx-auto w-full">
      {/* PageHeader — Figma: Bold 20px #3a424e + Regular 13px #636e7c */}
      <div className="flex flex-col gap-1">
        <h1
          className="font-bold text-[20px]"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          Oportunidades
        </h1>
        <p
          className="font-normal text-[13px]"
          style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
        >
          Descubra vagas ideais para você
        </p>
      </div>

      {/* SwitchPill — Figma node 22:1160 */}
      <div
        className="flex items-center p-1 rounded-full w-full"
        style={{ background: '#f3f4f6', height: 47 }}
      >
        {(['para-voce', 'explore'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'para-voce' ? 'Para Você' : 'Explorar Todas';
          return (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className="flex-1 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                height:     39,
                background: isActive ? '#3092bb' : 'transparent',
                boxShadow:  isActive
                  ? '0px 4px 6px 0px rgba(0,0,0,0.1), 0px 2px 4px 0px rgba(0,0,0,0.1)'
                  : 'none',
                color:      isActive ? '#ffffff' : '#636e7c',
                fontFamily: 'Montserrat, sans-serif',
                fontSize:   13,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'para-voce' ? (
        <>
          {/* "Seus Matches" section header */}
          <h2
            className="font-bold text-[15px]"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Seus Matches
          </h2>

          {/* Card list — responsive grid */}
          {opportunities.length === 0 ? (
            <p
              className="text-center py-12 text-[14px]"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              Nenhuma oportunidade encontrada.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) =>
                opp.is_partner ? (
                  <CardOportunidadeParceira key={opp.id} opportunity={opp} />
                ) : (
                  <CardOportunidades key={opp.id} opportunity={opp} />
                ),
              )}
            </div>
          )}
        </>
      ) : (
        <Suspense
          fallback={
            <p
              className="text-center py-12 text-[14px]"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              Carregando...
            </p>
          }
        >
          <ExploreClient opportunities={opportunities} filters={filters} />
        </Suspense>
      )}
    </div>
  );
}
