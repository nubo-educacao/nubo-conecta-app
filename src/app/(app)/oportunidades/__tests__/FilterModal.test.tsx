// @vitest-environment jsdom
// TDD — Sprint 2.5: FilterModal behavioural tests.
// Cobre os contratos críticos:
//   1. Não renderiza nada quando open=false
//   2. Renderiza o dialog quando open=true
//   3. Botão "Aplicar filtros" chama onApply com os valores selecionados
//   4. Fechar via botão X chama onClose SEM chamar onApply (sem persistência)
//   5. Fechar via backdrop chama onClose
//   6. Inicializa os selects com os valores recebidos por prop

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

import FilterModal from '../FilterModal';

describe('FilterModal', () => {
  const onClose = vi.fn();
  const onApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Visibilidade ───────────────────────────────────────────────────────────

  it('retorna null e não renderiza nada quando open=false', () => {
    const { container } = render(
      <FilterModal open={false} onClose={onClose} onApply={onApply} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o dialog quando open=true', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);
    expect(screen.getByRole('dialog', { name: 'Filtros avançados' })).toBeDefined();
  });

  it('renderiza o título "Filtros"', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);
    expect(screen.getByText('Filtros')).toBeDefined();
  });

  // ── Fechamento ─────────────────────────────────────────────────────────────

  it('botão X chama onClose SEM chamar onApply', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);

    fireEvent.click(screen.getByLabelText('Fechar filtros'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clique no backdrop chama onClose SEM chamar onApply', () => {
    const { container } = render(
      <FilterModal open={true} onClose={onClose} onApply={onApply} />,
    );
    // O backdrop é o primeiro elemento com aria-hidden="true"
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });

  // ── Botão Aplicar ──────────────────────────────────────────────────────────

  it('"Aplicar filtros" chama onApply com location undefined quando não selecionado', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);

    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ location: undefined }));
  });

  it('"Aplicar filtros" passa program_preference=sisu quando selecionado', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);

    fireEvent.click(screen.getByText('SISU'));
    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ program_preference: 'sisu' }),
    );
  });

  it('"Aplicar filtros" passa location=SP quando estado selecionado', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);

    const locationSelect = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(locationSelect, { target: { value: 'SP' } });
    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'SP' }),
    );
  });

  it('"Aplicar filtros" passa location=undefined quando "Todos os estados" selecionado', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);

    const locationSelect = screen.getByRole('combobox') as HTMLSelectElement;
    // Garantir que está no valor vazio (padrão)
    fireEvent.change(locationSelect, { target: { value: '' } });
    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ location: undefined }),
    );
  });

  // ── Inicialização com props ────────────────────────────────────────────────

  it('inicializa com os valores das props location', () => {
    render(
      <FilterModal
        open={true}
        onClose={onClose}
        onApply={onApply}
        location="RJ"
      />,
    );

    const locationSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(locationSelect.value).toBe('RJ');
  });

  it('renderiza as opções de programa', () => {
    render(<FilterModal open={true} onClose={onClose} onApply={onApply} />);
    expect(screen.getByText('SISU')).toBeDefined();
    expect(screen.getByText('ProUni')).toBeDefined();
    expect(screen.getByText('Bolsa (parceiro)')).toBeDefined();
  });
});
