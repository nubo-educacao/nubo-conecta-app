// Home Dashboard — Sprint 03 Épico 1A
// Server Component: fetches seed data for carousels server-side.
// Interactive logic (auth, match, CTAs) delegated to HomeClient.

import AppShell from '@/components/layout/AppShell';
import HomeClient from './HomeClient';
import { getUnifiedOpportunities } from '@/services/opportunities';
import type { IUnifiedOpportunity } from '@/types/opportunities';

export default async function HomePage() {
  // Fetch carousels server-side for instant render — fail gracefully on errors
  let recentOpportunities: IUnifiedOpportunity[] = [];
  let partnerOpportunities: IUnifiedOpportunity[] = [];

  try {
    const [recent, partners] = await Promise.all([
      getUnifiedOpportunities({ mode: 'explorar', page: 0, limit: 8 }),
      getUnifiedOpportunities({ mode: 'para-voce', page: 0, limit: 8 }),
    ]);
    recentOpportunities = recent;
    // Filter to partners only for "em destaque" carousel
    partnerOpportunities = partners.filter((o) => o.is_partner);
  } catch {
    // Fail gracefully — carousels will render empty, CTA remains functional
  }

  return (
    <AppShell>
      <HomeClient
        recentOpportunities={recentOpportunities}
        partnerOpportunities={partnerOpportunities}
      />
    </AppShell>
  );
}
