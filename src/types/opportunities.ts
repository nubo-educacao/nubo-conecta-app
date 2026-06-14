// SOURCE OF TRUTH: IUnifiedOpportunity contract for Sprint 02.
export type OpportunitySourceType = 'sisu' | 'prouni' | 'partner';
export type OpportunityCategory = 'public_universities' | 'grants_scholarships' | 'educational_programs';
export interface ExploreFilters {
  q?: string;
  category?: string;
  modality?: 'presential' | 'online';
  location?: string;
  shifts?: string[];
  quota_types?: string[];
  course_interests?: string[];
  program_preference?: string;
  university_preference?: string;
  /** Cidade específica (texto livre, ilike na coluna location) */
  city?: string;
}
export interface IUnifiedOpportunity {
  id: string; title: string; institution_name: string; is_partner: boolean;
  type: OpportunitySourceType; opportunity_type: string; category: OpportunityCategory;
  category_label: string; location: string; education_level: string; badges: string[];
  match_score?: number; created_at: string; status?: string; starts_at?: string; ends_at?: string;
  external_redirect?: { enabled: boolean; url?: string; };
  min_cutoff_score_current?: number; min_cutoff_score_prev?: number;
  max_cutoff_score_current?: number; max_cutoff_score_prev?: number;
  institution_cover_url?: string;
  nu_vagas_autorizadas?: string;
  qt_vagas_ofertadas_current?: string; qt_vagas_ofertadas_prev?: string;
  qt_inscricao_current?: string; qt_inscricao_prev?: string;
  nu_media_minima_enem_current?: number; nu_media_minima_enem_prev?: number;
  vagas_ociosas_current?: boolean; vagas_ociosas_prev?: boolean;
  institution_id?: string; institution_igc?: string; institution_organization?: string; institution_category?: string; institution_site?: string;
  eligibility_criteria?: any; benefits?: any; brand_color?: string; description?: string;
  weights?: { redacao?: number; matematica?: number; linguagens?: number; humanas?: number; natureza?: number; };
}
