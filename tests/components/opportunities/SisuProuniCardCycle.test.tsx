// @vitest-environment jsdom
// NUB-SUP-91 — Página de detalhes SiSU (contratos do RCA).
//  1. O badge mostra ano.semestre para SiSU e ProUni, igual a OpportunitiesListCard.
//  2. Sem cycle_year não há fallback hardcoded de ano.
//  3. O aviso de ciclo anterior só aparece quando os dados são herdados, citando o ciclo.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import SisuProuniCard from '@/components/opportunities/SisuProuniCard';
import { useProgram } from '@/hooks/useProgram';

expect.extend(jestDomMatchers);

vi.mock('@/hooks/useProgram', () => ({ useProgram: vi.fn() }));

describe('NUB-SUP-91 — SisuProuniCard: ciclo e aviso', () => {
  beforeEach(() => {
    (useProgram as any).mockReturnValue({ title: 'SiSU', description: '', status: 'active', loading: false });
  });

  it('badge SiSU mostra ano.semestre, igual às Opções Disponíveis', () => {
    render(<SisuProuniCard opportunity_type="sisu" cycle_year={2026} cycle_semester="1" min_cutoff_score={674.8} />);
    expect(screen.getByText('SISU 2026.1')).toBeInTheDocument();
  });

  it('badge ProUni continua com ano.semestre (sem regressão)', () => {
    render(<SisuProuniCard opportunity_type="prouni" cycle_year={2027} cycle_semester="1" />);
    expect(screen.getByText('PROUNI 2027.1')).toBeInTheDocument();
  });

  it('sem ciclo conhecido não inventa o ano 2025', () => {
    render(<SisuProuniCard opportunity_type="sisu" />);
    expect(screen.queryByText(/2025/)).not.toBeInTheDocument();
  });

  it('aviso de ciclo anterior não aparece quando os dados são do ciclo vigente', () => {
    render(<SisuProuniCard opportunity_type="sisu" cycle_year={2026} cycle_semester="1" min_cutoff_score={674.8} />);
    expect(screen.queryByText(/Dados baseados no ciclo/)).not.toBeInTheDocument();
  });

  it('aviso cita o ciclo de origem quando os dados são herdados', () => {
    render(
      <SisuProuniCard opportunity_type="sisu" cycle_year={2027} cycle_semester="1" source_cycle_label="2026.1" />
    );
    expect(screen.getByText(/Dados baseados no ciclo 2026\.1 do MEC/)).toBeInTheDocument();
  });

  it('ProUni herdado também mostra o aviso com o ciclo de origem', () => {
    render(
      <SisuProuniCard opportunity_type="prouni" cycle_year={2027} cycle_semester="1" source_cycle_label="2026.1" />
    );
    expect(screen.getByText('PROUNI 2027.1')).toBeInTheDocument();
    expect(screen.getByText(/Dados baseados no ciclo 2026\.1 do MEC/)).toBeInTheDocument();
  });
});
