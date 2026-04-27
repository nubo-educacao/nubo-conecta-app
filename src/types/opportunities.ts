// SOURCE OF TRUTH: IUnifiedOpportunity contract for Sprint 02.
// This interface mirrors the columns of the v_unified_opportunities Postgres view.
// If the view DDL changes, update this interface and the matching type in nubo-conecta-admin.
// See: nubo-conecta-admin/supabase/migrations/20260401130400_v_unified_opportunities.sql

export type OpportunitySourceType = 'sisu' | 'prouni' | 'partner';

export type OpportunityCategory =
  | 'public_universities'
  | 'grants_scholarships'
  | 'educational_programs';

export interface ExploreFilters {
  q?: string;
  category?: string;
  modality?: 'presential' | 'online';
  location?: string;
}

export interface IUnifiedOpportunity {
  /** Prefixed ID: 'mec_<uuid>' or 'partner_<uuid>' — maps to v_unified_opportunities.unified_id */
  id: string;
  /** Course name (MEC) or opportunity name (partner) */
  title: string;
  /** Institution name */
  institution_name: string;
  /** true for partner_opportunities branch, false for MEC branch */
  is_partner: boolean;
  /** Source type — drives category chip and card variant selection */
  type: OpportunitySourceType;
  /** Sub-type (e.g. 'bolsa', 'bootcamp', 'mentoria') for partners; 'sisu'|'prouni' for MEC */
  opportunity_type: string;
  category: OpportunityCategory;
  /** Human-readable category label for display (e.g. "Universidades Públicas") */
  category_label: string;
  /** "City, State" for MEC; "Nacional" for partners */
  location: string;
  /** e.g. "Graduação" — may be derived client-side if not in view */
  education_level: string;
  /** Badge strings (e.g. "100% Gratuito", shift name) */
  badges: string[];
  /** Weighted ENEM match score from match_opportunities RPC — optional (only in "Para Você" mode) */
  match_score?: number;
  /** ISO 8601 timestamp */
  created_at: string;
  /** Sprint 6: lifecycle status (approved | inactive | pending) */
  status?: string;
  /** Sprint 6: opportunity start date — for display and alert logic */
  starts_at?: string;
  /** Sprint 6: opportunity end date — for display and alert logic */
  ends_at?: string;
  /** External redirect config — only present for partner opportunities */
  external_redirect?: {
    enabled: boolean;
    url?: string;
  };
}
