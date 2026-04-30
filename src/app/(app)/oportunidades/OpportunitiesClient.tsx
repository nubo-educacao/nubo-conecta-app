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

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import MatchOnboardingForm from '@/components/match/MatchOnboardingForm';
import ExploreClient from './ExploreClient';
import type { IUnifiedOpportunity, ExploreFilters } from '@/types/opportunities';

interface OpportunitiesClientProps {
  opportunities: IUnifiedOpportunity[];
  activeTab: 'para-voce' | 'explore';
  filters: ExploreFilters;
}

export default function OpportunitiesClient({ opportunities, activeTab, filters }: OpportunitiesClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isRefining, setIsRefining] = useState(false);
  
  const onboardingCompleted = user?.user_metadata?.onboarding_completed as boolean | undefined;

  // Reset refinement state when switching tabs
  useEffect(() => {
    setIsRefining(false);
  }, [activeTab]);

  const switchTab = (tab: 'para-voce' | 'explore') => {
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-24 mx-auto w-full max-w-7xl">
      {/* PageHeader — Figma: Bold 20px #3a424e + Regular 13px #636e7c */}
      <div className="flex flex-col gap-1">
        <h1
          className="font-bold text-[24px]"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          Oportunidades
        </h1>
        <p
          className="font-medium text-[14px]"
          style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
        >
          Descubra vagas ideais para você
        </p>
      </div>

      {/* SwitchPill — Figma node 22:1160 */}
      <div
        className="flex items-center p-1 rounded-full w-full max-w-md mx-auto my-4 shadow-sm"
        style={{ background: '#f3f4f6', height: 47 }}
      >
        {/* Para Você tab */}
        <button
          onClick={() => switchTab('para-voce')}
          className="flex-1 flex items-center justify-center gap-2 rounded-full transition-all duration-300"
          style={{
            height:     39,
            background: activeTab === 'para-voce' ? '#3092bb' : 'transparent',
            boxShadow:  activeTab === 'para-voce'
              ? '0px 4px 10px 0px rgba(48,146,187,0.3)'
              : 'none',
            color:      activeTab === 'para-voce' ? '#ffffff' : '#636e7c',
            fontFamily: 'Montserrat, sans-serif',
            fontSize:   13,
            fontWeight: 700,
          }}
        >
          <Sparkles size={16} />
          Para Você
        </button>

        {/* Explorar Todas tab */}
        <button
          onClick={() => switchTab('explore')}
          className="flex-1 flex items-center justify-center rounded-full transition-all duration-300"
          style={{
            height:     39,
            background: activeTab === 'explore' ? '#3092bb' : 'transparent',
            boxShadow:  activeTab === 'explore'
              ? '0px 4px 10px 0px rgba(48,146,187,0.3)'
              : 'none',
            color:      activeTab === 'explore' ? '#ffffff' : '#636e7c',
            fontFamily: 'Montserrat, sans-serif',
            fontSize:   13,
            fontWeight: 700,
          }}
        >
          Explorar Todas
        </button>
      </div>

      {activeTab === 'para-voce' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {user && (!onboardingCompleted || isRefining) ? (
            /* Estado A: onboarding incompleto ou Refazer Match — exibe formulário */
            <div className="flex flex-col gap-4">
              {isRefining && (
                <button
                  onClick={() => setIsRefining(false)}
                  className="self-start text-[13px] font-bold text-[#3092bb] flex items-center gap-2 hover:underline mb-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  ← Voltar para Meus Matches
                </button>
              )}
              <MatchOnboardingForm
                userId={user.id}
                onComplete={() => {
                  setIsRefining(false);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Estado B: onboarding completo — exibe matches com opção de refazer */}
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-[18px]"
                  style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
                >
                  Seus Matches
                </h2>
                <button
                  onClick={() => setIsRefining(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/60 border border-[#3092bb]/30 rounded-2xl text-[#3092bb] text-[13px] font-bold hover:bg-[#3092bb] hover:text-white hover:border-[#3092bb] transition-all duration-300 shadow-sm active:scale-95"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <RefreshCw size={14} className={isRefining ? 'animate-spin' : ''} />
                  Refazer Match
                </button>
              </div>

              {/* Card list — responsive grid */}
              {opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/30 backdrop-blur-md rounded-3xl border border-white/20">
                  <div className="bg-[#E0F2FE] p-4 rounded-full text-[#024F86] mb-4">
                    <Sparkles size={32} />
                  </div>
                  <p
                    className="text-center text-[16px] font-medium"
                    style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Nenhuma oportunidade encontrada.
                  </p>
                  <p className="text-center text-[14px] text-[#636e7c] mt-2 max-w-md">
                    Tente ajustar suas preferências para encontrar cursos que combinem com seu perfil.
                  </p>
                  <button
                    onClick={() => setIsRefining(true)}
                    className="mt-8 px-8 py-3 bg-[#3092bb] text-white rounded-2xl font-bold shadow-lg shadow-[#3092bb]/20 hover:bg-[#2a81a5] transition-all active:scale-95"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Ajustar Preferências
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
