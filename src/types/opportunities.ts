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
}
export interface IUnifiedOpportunity {
  id: string; title: string; institution_name: string; is_partner: boolean;
  type: OpportunitySourceType; opportunity_type: string; category: OpportunityCategory;
  category_label: string; location: string; education_level: string; badges: string[];
  match_score?: number; created_at: string; status?: string; starts_at?: string; ends_at?: string;
  external_redirect?: { enabled: boolean; url?: string; };
  min_cutoff_score?: number; max_cutoff_score?: number; institution_cover_url?: string;
  nu_vagas_autorizadas?: string; qt_vagas_ofertadas?: string; qt_inscricao_2025?: string; vagas_ociosas_2025?: number;
  institution_id?: string; institution_igc?: string; institution_organization?: string; institution_category?: string; institution_site?: string;
  eligibility_criteria?: any; benefits?: any; brand_color?: string; description?: string;
  weights?: { redacao?: number; matematica?: number; linguagens?: number; humanas?: number; natureza?: number; };
}
