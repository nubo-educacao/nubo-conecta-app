// types/institutions.ts — Sprint 8.0
// Contrato do domínio instituições unificado (parceiras + MEC).
// Espelha as colunas da view v_unified_institutions.

export type InstitutionType = 'partner' | 'mec';

export interface UnifiedInstitution {
  id: string;
  name: string;
  location: string | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string | null;
  description: string | null;
  type: InstitutionType;
  opp_types?: string[] | null;
  acronym?: string | null;
  academic_organization?: string | null;
  administrative_category?: string | null;
}
