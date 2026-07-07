// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import SisuProuniCard from '../SisuProuniCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);

// Mock the hook
vi.mock('@/hooks/useProgram', () => ({
  useProgram: vi.fn(),
}));

import { useProgram } from '@/hooks/useProgram';

describe('SisuProuniCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título e descrição customizados da DB', () => {
    (useProgram as any).mockReturnValue({
      title: 'SiSU Customizado 2026',
      description: 'Esta é uma descrição vinda da tabela de programas.',
      status: 'active',
      loading: false,
    });

    render(
      <SisuProuniCard
        opportunity_type="sisu"
        cycle_year={2026}
        cycle_semester="1"
      />
    );

    expect(screen.getByText('SiSU Customizado 2026')).toBeInTheDocument();
    expect(
      screen.getByText('Esta é uma descrição vinda da tabela de programas.')
    ).toBeInTheDocument();
  });

  it('suporta parsing de Markdown simples (bold, italic, links) na descrição', () => {
    (useProgram as any).mockReturnValue({
      title: 'ProUni Custom',
      description:
        'O ProUni tem **bolsas integrais** e *parciais* no [site do MEC](https://mec.gov.br).',
      status: 'active',
      loading: false,
    });

    render(
      <SisuProuniCard
        opportunity_type="prouni"
        cycle_year={2025}
        cycle_semester="1"
      />
    );

    // Verify bold text
    const boldEl = screen.getByText('bolsas integrais');
    expect(boldEl.tagName).toBe('STRONG');
    expect(boldEl).toHaveClass('font-bold text-[#3A424E]');

    // Verify italic text
    const italicEl = screen.getByText('parciais');
    expect(italicEl.tagName).toBe('EM');
    expect(italicEl).toHaveClass('italic');

    // Verify link
    const linkEl = screen.getByRole('link', { name: 'site do MEC' });
    expect(linkEl).toHaveAttribute('href', 'https://mec.gov.br');
    expect(linkEl).toHaveAttribute('target', '_blank');
    expect(linkEl).toHaveStyle({ color: '#7030C2' }); // ProUni color
  });

  it('oculta nota de corte e exibe vagas ofertadas e ociosas para prouni', () => {
    (useProgram as any).mockReturnValue({
      title: 'ProUni Custom',
      description: 'Descrição do ProUni',
      status: 'active',
      loading: false,
    });

    render(
      <SisuProuniCard
        opportunity_type="prouni"
        cycle_year={2025}
        cycle_semester="1"
        min_cutoff_score={450}
        max_cutoff_score={600}
        total_vacancies={15}
        vagas_ociosas_prev={true}
      />
    );

    // Verify cutoff score is NOT in the document
    expect(screen.queryByText('Nota de Corte')).not.toBeInTheDocument();
    expect(screen.queryByText('450.0')).not.toBeInTheDocument();
    expect(screen.queryByText('450.0 a 600.0')).not.toBeInTheDocument();

    // Verify total vacancies are displayed
    expect(screen.getByText('Vagas Ofertadas')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    // Verify status tile with vagas ociosas is displayed
    expect(screen.getByText('Status das Vagas')).toBeInTheDocument();
    expect(screen.getByText('Vagas Ociosas')).toBeInTheDocument();
  });
});
