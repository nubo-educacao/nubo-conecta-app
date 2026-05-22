// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { useProgram } from '@/hooks/useProgram';
import { vi, describe, beforeEach, it, expect } from 'vitest';

const {
  mockFrom,
  mockMaybeSingle,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  
  // Create a builder mock that supports chaining methods like eq, order, limit, maybeSingle
  const mockBuilder = {
    eq: vi.fn().mockImplementation(() => mockBuilder),
    order: vi.fn().mockImplementation(() => mockBuilder),
    limit: vi.fn().mockImplementation(() => mockBuilder),
    maybeSingle: mockMaybeSingle,
  };

  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockImplementation(() => mockBuilder),
  }));

  return {
    mockFrom,
    mockMaybeSingle,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('useProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna dados do programa quando encontrado', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        title: 'SiSU 2026.1 Personalizado',
        description: 'Descrição customizada do SiSU',
        status: 'active',
      },
      error: null,
    });

    const { result } = renderHook(() => useProgram('sisu', 2026, '1'));

    // No primeiro render, deve estar em loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.title).toBe('SiSU 2026.1 Personalizado');
    expect(result.current.description).toBe('Descrição customizada do SiSU');
    expect(result.current.status).toBe('active');
  });

  it('cai no fallback se a query falhar ou retornar vazio', async () => {
    // Simula retornar nulo tanto para a busca direta quanto para a busca do mais recente
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => useProgram('sisu', 2025, '1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Deve retornar o fallback hardcoded para sisu
    expect(result.current.title).toBe('Sobre o SiSU');
    expect(result.current.description).toContain('O SiSU (Sistema de Seleção Unificada) utiliza a nota do ENEM');
    expect(result.current.status).toBe('inactive');
  });

  it('busca o programa mais recente se não encontrar correspondência exata para o ano/semestre', async () => {
    // Primeira chamada para a busca exata (retorna null)
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    // Segunda chamada para a busca do mais recente (retorna o mais recente da DB)
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        title: 'SiSU 2026.2 Mais Recente',
        description: 'Descrição 2026.2',
        status: 'incoming',
      },
      error: null,
    });

    const { result } = renderHook(() => useProgram('sisu', 2025, '1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.title).toBe('SiSU 2026.2 Mais Recente');
    expect(result.current.description).toBe('Descrição 2026.2');
    expect(result.current.status).toBe('incoming');
  });
});
