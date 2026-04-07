'use client';

// HomeClient — Sprint 03 Épico 1A
// Interactive shell of the Home Dashboard.
// Handles auth state, CTA transitions, and match generation.

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DynamicCTA, { type CTAState } from '@/components/home/DynamicCTA';
import SmartSearch from '@/components/home/SmartSearch';
import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import InstitutionCarousel from '@/components/home/InstitutionCarousel';
import MatchOnboarding from '@/components/match/MatchOnboarding';
import MatchResults from '@/components/match/MatchResults';
import { useMatchResults } from '@/hooks/useMatchResults';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface HomeClientProps {
  recentOpportunities: IUnifiedOpportunity[];
  partnerOpportunities: IUnifiedOpportunity[];
}

export default function HomeClient({
  recentOpportunities,
  partnerOpportunities,
}: HomeClientProps) {
  const { user, loading, setShowAuthModal } = useAuth();

  // Use user ID as profile ID (1:1 mapping for simplest case)
  const { results, matchState, error: matchError, runMatch, loadExisting } = useMatchResults(
    user?.id ?? null,
  );

  // Load existing matches when user is authenticated
  useEffect(() => {
    if (user) {
      loadExisting();
    }
  }, [user, loadExisting]);

  // Derive CTA state
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
    <div className="flex flex-col gap-6 py-5">
      {/* Greeting */}
      <div className="px-4">
        {user ? (
          <h1
            className="text-2xl font-bold"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Olá! 👋
          </h1>
        ) : (
          <h1
            className="text-2xl font-bold"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Bem-vindo ao{' '}
            <span style={{ color: '#38B1E4' }}>Nubo Conecta</span>
          </h1>
        )}
        <p
          className="text-sm mt-1"
          style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
        >
          Sua ponte para oportunidades educacionais.
        </p>
      </div>

      {/* Smart Search */}
      <div className="px-4">
        <SmartSearch />
      </div>

      {/* Dynamic CTA */}
      <div className="px-4">
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

      {/* Match Section */}
      {showMatchSection && (
        <section
          className="mx-4 rounded-2xl overflow-hidden"
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
            <MatchResults
              results={results}
              onRegenerate={runMatch}
              isLoading={false}
            />
          ) : (
            <MatchOnboarding
              onGenerate={runMatch}
              isLoading={matchState === 'loading'}
            />
          )}
        </section>
      )}

      {/* Partner opportunities carousel */}
      {partnerOpportunities.length > 0 && (
        <OpportunityCarousel
          title="Oportunidades em destaque"
          opportunities={partnerOpportunities}
          seeAllHref="/oportunidades"
        />
      )}

      {/* Recent opportunities carousel */}
      {recentOpportunities.length > 0 && (
        <OpportunityCarousel
          title="Novidades"
          opportunities={recentOpportunities}
          seeAllHref="/oportunidades?tab=explore"
        />
      )}

      {/* Bottom padding for BottomNav */}
      <div className="h-4" />
    </div>
  );
}
