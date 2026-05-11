'use client';

// HomeClient — Sprint 05 CMS Dinâmico
// Renderiza seções dinamicamente a partir do array sections fornecido pelo Server Component.
// A lógica de match, auth e CTA é mantida; a renderização de carrosséis é agora orientada por dados.

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DynamicCTA, { type CTAState } from '@/components/home/DynamicCTA';
import HeroSearch from '@/components/home/HeroSearch';
import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import InstitutionCarousel from '@/components/home/InstitutionCarousel';
import ImportantDates from '@/components/home/ImportantDates';
import { supabase } from '@/lib/supabase';
import type { IHomeSectionWithData } from './page';

interface HomeClientProps {
  sections: IHomeSectionWithData[];
}

interface ApplicationSummary {
  id: string;
  status: string;
}

export default function HomeClient({ sections }: HomeClientProps) {
  const { user, loading, setShowAuthModal } = useAuth();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApplications([]);
      setAppsLoading(false);
      return;
    }

    setAppsLoading(true);
    supabase
      .from('student_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .then(({ data }: { data: any[] | null }) => {
        setApplications(data || []);
        setAppsLoading(false);
      });
  }, [user]);

  const onboardingCompleted = user?.user_metadata?.onboarding_completed as boolean | undefined;

  // CTA state logic
  let ctaState: CTAState = 'loading';
  let lastDraftId: string | null = null;
  let countInProgress = 0;

  if (!loading && !appsLoading) {
    if (!user) {
      ctaState = 'visitor';
    } else if (!onboardingCompleted) {
      ctaState = 'no-profile';
    } else {
      const drafts = applications.filter(a => a.status === 'DRAFT');
      const submitted = applications.filter(a => a.status !== 'DRAFT');
      
      countInProgress = drafts.length;
      if (drafts.length > 0) lastDraftId = drafts[0].id;

      if (submitted.length > 0) {
        ctaState = 'completed-application';
      } else if (drafts.length > 0) {
        ctaState = 'application-in-progress';
      } else {
        ctaState = 'no-applications';
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-6 pb-5">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          ctaState={ctaState}
          lastDraftId={lastDraftId}
          countInProgress={countInProgress}
          onOpenAuth={() => setShowAuthModal(true)}
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
  lastDraftId: string | null;
  countInProgress: number;
  onOpenAuth: () => void;
}

function SectionRenderer({
  section,
  ctaState,
  lastDraftId,
  countInProgress,
  onOpenAuth,
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
              lastDraftId={lastDraftId}
              countInProgress={countInProgress}
              onOpenAuth={onOpenAuth}
            />
          </div>
        </div>
      );

    case 'match_carousel': {
      // O usuário pediu explicitamente para tirar a exibição de matches
      return null;
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
