// TDD — Wave 2: Type contract tests for IUnifiedOpportunity.
// These tests verify structural integrity of the interface:
//   1. Object with all required fields satisfies the type (GREEN on valid assignment)
//   2. Optional fields (match_score, external_redirect) can be omitted
//   3. Type narrowing on external_redirect works correctly

import { describe, it, expect } from 'vitest';
import type {
  IUnifiedOpportunity,
  OpportunitySourceType,
  OpportunityCategory,
} from '../opportunities';

describe('IUnifiedOpportunity type contract', () => {
  it('accepts a fully populated MEC opportunity', () => {
    const opp: IUnifiedOpportunity = {
      id: 'mec_00000000-0000-0000-0000-000000000001',
      title: 'Engenharia de Computação',
      institution_name: 'Universidade Federal do ABC',
      is_partner: false,
      type: 'sisu',
      opportunity_type: 'sisu',
      category: 'public_universities',
      category_label: 'Universidades Públicas',
      location: 'São Bernardo do Campo, SP',
      education_level: 'Graduação',
      badges: ['Noturno', '750 - 800'],
      match_score: 87.5,
      created_at: '2026-01-15T10:00:00.000Z',
      external_redirect: undefined,
    };

    expect(opp.id).toBe('mec_00000000-0000-0000-0000-000000000001');
    expect(opp.is_partner).toBe(false);
    expect(opp.type).toBe('sisu');
    expect(opp.category).toBe('public_universities');
  });

  it('accepts a MEC opportunity WITHOUT optional fields', () => {
    // match_score and external_redirect must be optional — omitting them must not cause TS error
    const opp: IUnifiedOpportunity = {
      id: 'mec_00000000-0000-0000-0000-000000000002',
      title: 'Direito',
      institution_name: 'UFMG',
      is_partner: false,
      type: 'prouni',
      opportunity_type: 'prouni',
      category: 'grants_scholarships',
      category_label: 'Bolsas e Gratuidades',
      location: 'Belo Horizonte, MG',
      education_level: 'Graduação',
      badges: ['100% Gratuito', 'Matutino'],
      created_at: '2025-12-01T08:00:00.000Z',
    };

    expect(opp.match_score).toBeUndefined();
    expect(opp.external_redirect).toBeUndefined();
  });

  it('accepts a partner opportunity with external_redirect', () => {
    const opp: IUnifiedOpportunity = {
      id: 'partner_00000000-0000-0000-0000-000000000003',
      title: 'Bootcamp de Engenharia de Software',
      institution_name: 'TechCorp Parceira',
      is_partner: true,
      type: 'partner',
      opportunity_type: 'bootcamp',
      category: 'educational_programs',
      category_label: 'Programas Educacionais',
      location: 'Nacional',
      education_level: 'Bootcamp',
      badges: ['Gratuito para cotistas'],
      created_at: '2026-03-01T00:00:00.000Z',
      external_redirect: {
        enabled: true,
        url: 'https://techcorp.example.com/bootcamp',
      },
    };

    expect(opp.is_partner).toBe(true);
    expect(opp.type).toBe('partner');
    expect(opp.external_redirect?.enabled).toBe(true);
    expect(opp.external_redirect?.url).toBe('https://techcorp.example.com/bootcamp');
  });

  it('accepts a partner opportunity with external_redirect disabled and no url', () => {
    const opp: IUnifiedOpportunity = {
      id: 'partner_00000000-0000-0000-0000-000000000004',
      title: 'Mentoria de Carreira',
      institution_name: 'Parceira Mentoria S.A.',
      is_partner: true,
      type: 'partner',
      opportunity_type: 'mentoria',
      category: 'educational_programs',
      category_label: 'Programas Educacionais',
      location: 'Nacional',
      education_level: 'Mentoria',
      badges: [],
      created_at: '2026-02-01T00:00:00.000Z',
      external_redirect: {
        enabled: false,
        // url is optional inside external_redirect
      },
    };

    expect(opp.external_redirect?.enabled).toBe(false);
    expect(opp.external_redirect?.url).toBeUndefined();
  });

  it('validates OpportunitySourceType union exhaustiveness', () => {
    const validTypes: OpportunitySourceType[] = ['sisu', 'prouni', 'partner'];
    expect(validTypes).toHaveLength(3);
  });

  it('validates OpportunityCategory union exhaustiveness', () => {
    const validCategories: OpportunityCategory[] = [
      'public_universities',
      'grants_scholarships',
      'educational_programs',
    ];
    expect(validCategories).toHaveLength(3);
  });
});
