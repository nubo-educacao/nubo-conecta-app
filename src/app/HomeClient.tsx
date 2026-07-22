'use client';

// HomeClient — Sprint 05 CMS Dinâmico
// Renderiza seções dinamicamente a partir do array sections fornecido pelo Server Component.
// A lógica de match, auth e CTA é mantida; a renderização de carrosséis é agora orientada por dados.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DynamicCTA, { type CTAState } from '@/components/home/DynamicCTA';
import HeroSearch from '@/components/home/HeroSearch';
import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import InstitutionCarousel from '@/components/home/InstitutionCarousel';
import ImportantDates from '@/components/home/ImportantDates';
import { supabase } from '@/lib/supabase';
import { useGeolocation } from '@/hooks/useGeolocation';
import { calculateDraftProgress } from '@/utils/calculateDraftProgress';
import type { PartnerStep } from '@/components/forms/PartnerFormEngine';
import type { PartnerFormField } from '@/components/forms/FormFieldRenderer';
import type { IHomeSectionWithData } from './page';

interface HomeClientProps {
  sections: IHomeSectionWithData[];
}

interface ApplicationSummary {
  id: string;
  status: string;
  phase_id: string | null;
  partner_id: string;
  answers: Record<string, unknown>;
  opportunity_phases: { name: string } | null;
  partner_opportunities: { name: string } | null;
}

export default function HomeClient({ sections }: HomeClientProps) {
  const { user, loading, setShowAuthModal } = useAuth();
  const router = useRouter();

  const onboardingCompleted = user?.user_metadata?.onboarding_completed as boolean | undefined;

  // Geolocation integration with auto DB sync
  const { requestLocation, permissionState } = useGeolocation(user?.id);

  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [dismissedPhases, setDismissedPhases] = useState<string[]>([]);
  const [draftProgress, setDraftProgress] = useState<number>(0);
  const welcomeBackSentRef = useRef<string>('');

  // Dispatch welcome_back once per authenticated session on Home mount
  // useSystemIntents (in ChatFAB) listens for 'cloudinha-intent' and surfaces the response
  useEffect(() => {
    if (!user) return;
    const key = `${user.id}::welcome_back`;
    if (welcomeBackSentRef.current === key) return;
    welcomeBackSentRef.current = key;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cloudinha-intent', {
          detail: { intent_type: 'system_intent', type: 'welcome_back', metadata: {} },
        }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Request browser geolocation permission on first visit to home
  useEffect(() => {
    if (permissionState === 'prompt') {
      requestLocation();
    }
  }, [permissionState, requestLocation]);

  // Refresh page data when user location updates to load nearest opportunities
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      router.refresh();
    };
    window.addEventListener('nubo-matches-updated', handleUpdate);
    return () => {
      window.removeEventListener('nubo-matches-updated', handleUpdate);
    };
  }, [router]);

  useEffect(() => {
    if (!user) {
      setApplications([]);
      setAppsLoading(false);
      return;
    }

    setAppsLoading(true);
    supabase
      .from('student_applications')
      .select(`
        id, status, phase_id, partner_id, answers,
        opportunity_phases ( name ),
        partner_opportunities ( name )
      `)
      .eq('user_id', user.id)
      .then(({ data }: { data: any[] | null }) => {
        setApplications(data || []);
        setAppsLoading(false);
      });
  }, [user]);

  // Fetch steps + fields for the most recent DRAFT and compute progress
  useEffect(() => {
    const firstDraft = applications.find(a => a.status === 'DRAFT');
    if (!firstDraft) {
      setDraftProgress(0);
      return;
    }

    Promise.all([
      supabase.from('partner_steps').select('*').eq('partner_id', firstDraft.partner_id).order('sort_order'),
      supabase.from('partner_forms').select('*').eq('partner_id', firstDraft.partner_id).order('sort_order'),
    ]).then(([stepsRes, fieldsRes]) => {
      const steps = (stepsRes.data as PartnerStep[]) || [];
      const fields = (fieldsRes.data as PartnerFormField[]) || [];
      setDraftProgress(calculateDraftProgress(firstDraft.answers || {}, steps, fields));
    });
  }, [applications]);

  // Trigger Claudinha when a phase is updated
  useEffect(() => {
    if (!user || applications.length === 0) return;

    try {
      const storedNotified = localStorage.getItem(`nubo_notified_phases_${user.id}`);
      const notifiedMap = storedNotified ? JSON.parse(storedNotified) : {};
      let updated = false;

      applications.forEach(app => {
        if (app.phase_id && app.status !== 'DRAFT') {
          const lastNotifiedPhase = notifiedMap[app.id];
          if (lastNotifiedPhase !== app.phase_id) {
            // Dispatch intent to Cloudinha
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cloudinha-intent', {
                  detail: {
                    intent_type: 'system_intent',
                    type: 'phase_updated',
                    metadata: {
                      opportunity_name: app.partner_opportunities?.name || 'sua oportunidade',
                      phase_name: app.opportunity_phases?.name || 'nova fase'
                    }
                  }
                })
              );
            }
            notifiedMap[app.id] = app.phase_id;
            updated = true;
          }
        }
      });

      if (updated) {
        localStorage.setItem(`nubo_notified_phases_${user.id}`, JSON.stringify(notifiedMap));
      }
    } catch (e) {
      console.warn('[HomeClient] Error handling phase notification:', e);
    }
  }, [user, applications]);

  // Load dismissed banners
  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem(`nubo_clicked_banners_${user.id}`);
        if (stored) setDismissedPhases(JSON.parse(stored));
      } catch (e) {
        console.warn('Error loading clicked banners', e);
      }
    }
  }, [user]);

  // CTA state logic
  let ctaState: CTAState = 'loading';
  let lastDraftId: string | null = null;
  let countInProgress = 0;
  let phaseDataForCTA: { phaseId: string, opportunityName: string, phaseName: string, onClick: (id: string) => void } | undefined = undefined;

  if (!loading && !appsLoading) {
    if (!user) {
      ctaState = 'visitor';
    } else if (!onboardingCompleted) {
      ctaState = 'no-profile';
    } else {
      const activePhaseApps = applications.filter(a => a.phase_id && a.status !== 'DRAFT' && !dismissedPhases.includes(a.phase_id));
      const drafts = applications.filter(a => a.status === 'DRAFT');
      const submitted = applications.filter(a => a.status !== 'DRAFT');
      
      countInProgress = drafts.length;
      if (drafts.length > 0) lastDraftId = drafts[0].id;

      if (drafts.length > 0) {
        ctaState = draftProgress >= 100 ? 'application-ready-to-submit' : 'application-in-progress';
      } else if (activePhaseApps.length > 0) {
        ctaState = 'phase-updated';
        const phaseApp = activePhaseApps[0];
        phaseDataForCTA = {
          phaseId: phaseApp.phase_id!,
          opportunityName: (phaseApp.partner_opportunities as any)?.name || 'sua oportunidade',
          phaseName: (phaseApp.opportunity_phases as any)?.name || 'nova fase',
          onClick: (phaseId: string) => {
            const updated = [...dismissedPhases, phaseId];
            setDismissedPhases(updated);
            localStorage.setItem(`nubo_clicked_banners_${user.id}`, JSON.stringify(updated));
            router.push('/candidaturas');
          }
        };
      } else if (submitted.length > 0) {
        ctaState = 'completed-application';
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
          draftProgress={draftProgress}
          phaseData={phaseDataForCTA}
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
  draftProgress: number;
  phaseData?: { phaseId: string, opportunityName: string, phaseName: string, onClick: (id: string) => void };
  onOpenAuth: () => void;
}

function SectionRenderer({
  section,
  ctaState,
  lastDraftId,
  countInProgress,
  draftProgress,
  phaseData,
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
              draftProgress={draftProgress}
              phaseData={phaseData}
              onOpenAuth={onOpenAuth}
            />
          </div>
        </div>
      );

    case 'match_carousel': {
      const opps = section.opportunities ?? [];
      if (opps.length === 0) return null;
      return (
        <div className="max-w-7xl mx-auto w-full">
          <OpportunityCarousel
            title={section.title}
            opportunities={opps}
            seeAllHref={(config.see_all_href as string) ?? '/oportunidades?tab=para-voce'}
            desktopGridMode={(config.desktop_grid_mode as boolean) ?? false}
          />
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
