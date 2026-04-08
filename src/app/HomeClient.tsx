'use client';

// HomeClient — Sprint 03 Épico 1A / atualizado Sprint 3.5
// Shell interativa da Home Dashboard.
// Ordem de renderização (Sprint 3.5):
//   HeroSearch → CTA → Match Section → Oportunidades Destaque →
//   Novidades → Instituições Parceiras → Avisos e Datas (último)

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DynamicCTA, { type CTAState } from '@/components/home/DynamicCTA';
import HeroSearch from '@/components/home/HeroSearch';
import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import InstitutionCarousel from '@/components/home/InstitutionCarousel';
import ImportantDates from '@/components/home/ImportantDates';
import MatchOnboarding from '@/components/match/MatchOnboarding';
import MatchResults from '@/components/match/MatchResults';
import { useMatchResults } from '@/hooks/useMatchResults';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import type { IImportantDate } from '@/services/importantDates';
import type { IPartnerInstitution } from '@/services/institutions';

interface HomeClientProps {
  recentOpportunities: IUnifiedOpportunity[];
  partnerOpportunities: IUnifiedOpportunity[];
  importantDates: IImportantDate[];
  partnerInstitutions: IPartnerInstitution[];
}

export default function HomeClient({
  recentOpportunities,
  partnerOpportunities,
  importantDates,
  partnerInstitutions,
}: HomeClientProps) {
  const { user, loading, setShowAuthModal } = useAuth();

  const { results, matchState, error: matchError, runMatch, loadExisting } = useMatchResults(
    user?.id ?? null,
  );

  useEffect(() => {
    if (user) loadExisting();
  }, [user, loadExisting]);

  let ctaState: CTAState = 'loading';
  if (!loading) {
    if (!user) {
      ctaState = 'visitor';
    } else if (matchState === 'loading') {
      ctaState = 'loading';
    } else if (matchState === 'done' && results.length > 0) {
      ctaState = 'has-match';
    } else {
      ctaState = 'no-match';
    }
  }

  const showMatchSection = !!user;

  return (
    <div className="flex flex-col gap-6 pb-5">
      {/* 1. Hero Buscador */}
      <HeroSearch />

      {/* Container com margens */}
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 lg:px-8">
        {/* 2. Dynamic CTA */}
        <div>
          <DynamicCTA
            state={ctaState}
            matchCount={results.length}
            onOpenAuth={() => setShowAuthModal(true)}
            onGenerateMatch={runMatch}
          />
          {matchError && (
            <p
              className="mt-2 text-xs text-center"
              style={{ color: '#dc2626', fontFamily: 'Montserrat, sans-serif' }}
            >
              {matchError}
            </p>
          )}
        </div>

        {/* 3. Match Section — Para Você */}
        {showMatchSection && (
          <section
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(56,177,228,0.15)',
            }}
          >
            <div
              className="px-4 pt-4 pb-1 text-sm font-bold"
              style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
            >
              Para Você
            </div>
            {matchState === 'done' && results.length > 0 ? (
              <MatchResults results={results} onRegenerate={runMatch} isLoading={false} />
            ) : (
              <MatchOnboarding onGenerate={runMatch} isLoading={matchState === 'loading'} />
            )}
          </section>
        )}
      </div>

      {/* 4. Oportunidades em Destaque — Regra Grid-3 no desktop */}
      {partnerOpportunities.length > 0 && (
        <div className="max-w-7xl mx-auto w-full">
          <OpportunityCarousel
            title="Oportunidades em destaque"
            opportunities={partnerOpportunities}
            seeAllHref="/oportunidades"
            desktopGridMode
          />
        </div>
      )}

      {/* 5. Novidades */}
      {recentOpportunities.length > 0 && (
        <div className="max-w-7xl mx-auto w-full">
          <OpportunityCarousel
            title="Novidades"
            opportunities={recentOpportunities}
            seeAllHref="/oportunidades?tab=explore"
          />
        </div>
      )}

      {/* 6. Instituições Parceiras */}
      {partnerInstitutions.length > 0 && (
        <div className="max-w-7xl mx-auto w-full">
          <InstitutionCarousel
            institutions={partnerInstitutions}
            seeAllHref="/instituicoes"
          />
        </div>
      )}

      {/* 7. Avisos e Datas Importantes — ÚLTIMO elemento */}
      {importantDates.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-0">
          <ImportantDates dates={importantDates} />
        </div>
      )}

      {/* Espaço para BottomNav */}
      <div className="h-4" />
    </div>
  );
}
