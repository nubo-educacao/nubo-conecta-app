'use client';

// HomeClient — Sprint 05 CMS Dinâmico
// Renderiza seções dinamicamente a partir do array sections fornecido pelo Server Component.
// A lógica de match, auth e CTA é mantida; a renderização de carrosséis é agora orientada por dados.

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
import type { IHomeSectionWithData } from './page';

interface HomeClientProps {
  sections: IHomeSectionWithData[];
}

export default function HomeClient({ sections }: HomeClientProps) {
  const { user, loading, setShowAuthModal } = useAuth();
  const { results, matchState, error: matchError, runMatch, loadExisting } = useMatchResults(
    user?.id ?? null,
  );

  useEffect(() => {
    if (user) loadExisting();
  }, [user, loadExisting]);

  const onboardingCompleted = user?.user_metadata?.onboarding_completed as boolean | undefined;

  // CTA state logic (mantido da Sprint 3.5)
  let ctaState: CTAState = 'loading';
  if (!loading) {
    if (!user) ctaState = 'visitor';
    else if (!onboardingCompleted) ctaState = 'no-profile';
    else if (matchState === 'loading') ctaState = 'loading';
    else if (matchState === 'done' && results.length > 0) ctaState = 'has-match';
    else ctaState = 'no-match';
  }

  const showMatchSection = !!user && !!onboardingCompleted;

  return (
    <div className="flex flex-col gap-6 pt-6 pb-5">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          ctaState={ctaState}
          matchState={matchState}
          matchResults={results}
          matchError={matchError}
          showMatchSection={showMatchSection}
          onOpenAuth={() => setShowAuthModal(true)}
          onRunMatch={runMatch}
        />
      ))}

      {/* Espaço para BottomNav */}
      <div className="h-4" />
    </div>
  );
}

// ─── Renderizador de Seções ──────────────────────────────────────────────────

interface SectionRendererProps {
  section: IHomeSectionWithData;
  ctaState: CTAState;
  matchState: string;
  matchResults: any[];
  matchError: string | null;
  showMatchSection: boolean;
  onOpenAuth: () => void;
  onRunMatch: () => void;
}

function SectionRenderer({
  section,
  ctaState,
  matchState,
  matchResults,
  matchError,
  showMatchSection,
  onOpenAuth,
  onRunMatch,
}: SectionRendererProps) {
  const config = section.config as Record<string, unknown>;

  switch (section.section_type) {
    case 'hero_search':
      return <HeroSearch />;

    case 'dynamic_cta':
      return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 lg:px-8">
          <div>
            <DynamicCTA
              state={ctaState}
              matchCount={matchResults.length}
              onOpenAuth={onOpenAuth}
              onGenerateMatch={onRunMatch}
            />
            {matchError && (
              <p className="mt-2 text-xs text-center" style={{ color: '#dc2626', fontFamily: 'Montserrat, sans-serif' }}>
                {matchError}
              </p>
            )}
          </div>
        </div>
      );

    case 'match_carousel': {
      if (!showMatchSection) return null;
      return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 lg:px-8">
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(56,177,228,0.15)' }}
          >
            <div className="px-4 pt-4 pb-1 text-sm font-bold" style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}>
              {section.title}
            </div>
            {matchState === 'done' && matchResults.length > 0 ? (
              <MatchResults results={matchResults} onRegenerate={onRunMatch} isLoading={false} />
            ) : (
              <MatchOnboarding onGenerate={onRunMatch} isLoading={matchState === 'loading'} />
            )}
          </section>
        </div>
      );
    }

    case 'opportunity_carousel': {
      const opps = section.opportunities ?? [];
      if (opps.length === 0) return null;
      return (
        <div className="max-w-7xl mx-auto w-full">
          <OpportunityCarousel
            title={section.title}
            opportunities={opps}
            seeAllHref={(config.see_all_href as string) ?? '/oportunidades'}
            desktopGridMode={(config.desktop_grid_mode as boolean) ?? false}
          />
        </div>
      );
    }

    case 'institution_carousel': {
      const insts = section.institutions ?? [];
      if (insts.length === 0) return null;
      return (
        <div className="max-w-7xl mx-auto w-full">
          <InstitutionCarousel
            institutions={insts}
            seeAllHref={(config.see_all_href as string) ?? '/instituicoes'}
          />
        </div>
      );
    }

    case 'dates': {
      const dates = section.dates ?? [];
      if (dates.length === 0) return null;
      return (
        <div className="max-w-7xl mx-auto w-full px-0">
          <ImportantDates dates={dates} />
        </div>
      );
    }

    default:
      return null;
  }
}
