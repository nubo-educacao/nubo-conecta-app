// Home Dashboard — Sprint 03 Épico 1A / atualizado Sprint 3.5
// Server Component: fetches seed data for carousels, institutions and important dates server-side.
// Interactive logic (auth, match, CTAs) delegated to HomeClient.

import AppShell from '@/components/layout/AppShell';
import HomeClient from './HomeClient';
import { getUnifiedOpportunities } from '@/services/opportunities';
import { getImportantDates } from '@/services/importantDates';
import { getPartnerInstitutions } from '@/services/institutions';
import type { IUnifiedOpportunity } from '@/types/opportunities';
import type { IImportantDate } from '@/services/importantDates';
import type { IPartnerInstitution } from '@/services/institutions';

export default async function HomePage() {
  let recentOpportunities: IUnifiedOpportunity[] = [];
  let partnerOpportunities: IUnifiedOpportunity[] = [];
  let importantDates: IImportantDate[] = [];
  let partnerInstitutions: IPartnerInstitution[] = [];

  const [recentResult, partnersResult, datesResult, institutionsResult] = await Promise.allSettled([
    getUnifiedOpportunities({ mode: 'explorar', page: 0, limit: 8 }),
    getUnifiedOpportunities({ mode: 'para-voce', page: 0, limit: 8 }),
    getImportantDates(),
    getPartnerInstitutions(),
  ]);

  // Tracing explícito — visível nos logs do servidor Next.js
  if (recentResult.status === 'rejected')
    console.error('[Home] ERRO recentes:', recentResult.reason);
  if (partnersResult.status === 'rejected')
    console.error('[Home] ERRO para-voce:', partnersResult.reason);
  if (datesResult.status === 'rejected')
    console.error('[Home] ERRO datas:', datesResult.reason);
  if (institutionsResult.status === 'rejected')
    console.error('[Home] ERRO instituições:', institutionsResult.reason);

  if (recentResult.status === 'fulfilled') recentOpportunities = recentResult.value;
  if (partnersResult.status === 'fulfilled') {
    partnerOpportunities = partnersResult.value.filter((o) => o.is_partner);
  }
  if (datesResult.status === 'fulfilled') importantDates = datesResult.value;
  if (institutionsResult.status === 'fulfilled') partnerInstitutions = institutionsResult.value;

  return (
    <AppShell>
      <HomeClient
        recentOpportunities={recentOpportunities}
        partnerOpportunities={partnerOpportunities}
        importantDates={importantDates}
        partnerInstitutions={partnerInstitutions}
      />
    </AppShell>
  );
}
