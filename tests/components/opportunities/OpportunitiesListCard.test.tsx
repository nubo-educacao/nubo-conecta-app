// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import OpportunitiesListCard, { type Opportunity } from '@/components/opportunities/OpportunitiesListCard';

const prouni = (over: Partial<Opportunity>): Opportunity => ({
  id: 'mec_x',
  shift: 'Noturno',
  scholarship_type: 'Bolsa Integral',
  cutoff_score: 700,
  opportunity_type: 'prouni',
  year: 2026,
  semester: '2',
  vacancies: { broad_competition_offered: 0, quotas_offered: 0 },
  ...over,
});

describe('OpportunitiesListCard — ProUni', () => {
  it('mostra a modalidade (Ampla / PPI / PcD) como no SiSU, junto do tipo de bolsa', () => {
    render(
      <OpportunitiesListCard
        opportunities={[
          prouni({ id: 'mec_a', concurrency_type: 'AMPLA', concurrency_tags: [['AMPLA_CONCORRENCIA']] }),
          prouni({ id: 'mec_b', concurrency_type: 'COTA_PPI', concurrency_tags: [['PPI', 'INDIGENAS']] }),
          prouni({ id: 'mec_c', concurrency_type: 'COTA_PCD', concurrency_tags: [['PCD']], scholarship_type: 'Bolsa Parcial' }),
        ]}
      />
    );

    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Ampla Concorrência')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Bolsa Integral')).toBeInTheDocument();
    expect(within(rows[1]).getByText('PPI')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Indígenas')).toBeInTheDocument();
    expect(within(rows[2]).getByText('PcD')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Bolsa Parcial')).toBeInTheDocument();
  });

  it('sem tags, deriva a modalidade do concurrency_type (inclusive legado "PPI")', () => {
    render(<OpportunitiesListCard opportunities={[prouni({ concurrency_type: 'PPI' })]} />);
    // o tooltip (i) também mostra "PPI"; o chip é o que tem o estilo de tag
    const chips = screen.getAllByText('PPI').filter(el => el.className.includes('bg-purple-50'));
    expect(chips).toHaveLength(1);
  });
});
