// Institutions Page — Sprint 8.0
// Lista unificada: parceiras + MEC via v_unified_institutions.
// Server Component: fetch → InstitutionsClient (filtros + search client-side).

import AppShell from '@/components/layout/AppShell';
import { getUnifiedInstitutions } from '@/services/institutions';
import InstitutionsClient from './InstitutionsClient';

export default async function InstitutionsPage() {
  const institutions = await getUnifiedInstitutions();

  return (
    <AppShell>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-7xl mx-auto w-full">
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

        <InstitutionsClient institutions={institutions} />
      </div>
    </AppShell>
  );
}
