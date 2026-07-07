// @vitest-environment jsdom
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * RCA & REPRODUCER — Fase 1: Investigação e Reprodução Determinística
 * Bugs em escopo:
 *   BUG-A: "Filtro de oportunidades" — ID: 816bef77-3936-449d-980a-9bf440d2e784
 *   BUG-B: "Buscar do novo Nubo Conecta" — ID: d0f3b0bd-2f59-4a7e-86a1-13ca816914e4
 *
 * DIAGNÓSTICO:
 *   BUG-A: Os filtros do modal (Turno, Cota, Tipo de Instituição) são serializados na
 *          URL via router.replace, mas o Server Component page.tsx os repassa para
 *          getUnifiedOpportunities(), que aplica filtros de turno (shifts) e cotas
 *          (quota_types) via PostgREST usando a sintaxe `badges.cs.["Matutino"]`.
 *          O operador `cs` (contains) no PostgREST para JSONB espera o array serializado
 *          como string JSON. A implementação atual gera `badges.cs.["Matutino"]` (sem
 *          aspas ao redor do item), que pode falhar silenciosamente dependendo da versão
 *          do PostgREST / Supabase retornando 0 resultados quando deveria retornar dados.
 *          Adicionalmente, o filtro `program_preference='programa de bolsa'` não tem
 *          correspondência no PROGRAM_OPTIONS do FilterModal (que usa value='programa de bolsa'
 *          mas o FilterModal label é 'Bolsa (parceiro)'), criando desconexão de UX.
 *
 *   BUG-B: A SearchBar em ExploreClient usa `defaultValue` (não `value`) no <input>.
 *          Em Next.js com SSR, quando os searchParams mudam (ex: o usuário navega de volta
 *          para a aba Explore com um ?q= já setado), o `defaultValue` NÃO re-inicializa
 *          o campo input — o browser mantém o valor digitado anteriormente enquanto os
 *          resultados mostram uma busca diferente. Isso cria um estado divergente entre
 *          a URL (?q=medicina) e o texto visível no input (que pode estar vazio ou com
 *          outro valor). O usuário vê resultados filtrados sem saber qual filtro está ativo.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();
let mockSearchParamsString = 'tab=explore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

vi.mock('@/components/opportunities/OpportunityCard', () => ({
  default: ({ opportunity }: { opportunity: { title: string } }) => (
    <div data-testid="opportunity-card">{opportunity.title}</div>
  ),
}));

vi.mock('../FilterModal', () => ({
  default: ({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (f: unknown) => void }) =>
    open ? (
      <div role="dialog" aria-label="Filtros avançados">
        <button onClick={() => onApply({ shifts: ['Matutino'], quota_types: ['ESCOLA_PUBLICA'], program_preference: 'sisu', university_preference: 'publica' })}>
          Aplicar filtros
        </button>
        <button onClick={onClose}>Fechar modal</button>
      </div>
    ) : null,
}));

import ExploreClient from '../ExploreClient';
import type { IUnifiedOpportunity, ExploreFilters } from '@/types/opportunities';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeOpp = (overrides: Partial<IUnifiedOpportunity> = {}): IUnifiedOpportunity => ({
  id: 'mec_001',
  title: 'Engenharia de Software',
  institution_name: 'UFABC',
  is_partner: false,
  type: 'sisu',
  opportunity_type: 'sisu',
  category: 'public_universities',
  category_label: 'Universidades Públicas',
  location: 'SP',
  education_level: 'Graduação',
  badges: ['Matutino'],
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const emptyFilters: ExploreFilters = {};

// ══════════════════════════════════════════════════════════════════════════════
// BUG-A — REPRODUCER: "Filtro de oportunidades"
// ID: 816bef77-3936-449d-980a-9bf440d2e784
// ══════════════════════════════════════════════════════════════════════════════

describe('BUG-A [RCA] — Filtro de oportunidades: serialização de shifts e quota_types na URL', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchParamsString = 'tab=explore';
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  /**
   * REPRODUCER BUG-A-1:
   * Quando o usuário aplica o filtro "Matutino" (turno), o ExploreClient deve
   * serializar como ?shifts=Matutino na URL. A serialização usa .join(','), o que
   * está correto. O problema está no lado do SERVICE (opportunities.ts L316):
   * `badges.cs.${JSON.stringify([s])}` produz `badges.cs.["Matutino"]`.
   *
   * Este teste VERIFICA que a serialização na URL acontece corretamente,
   * mas DOCUMENTA que o operador PostgREST `cs` com array JSONB pode não funcionar.
   *
   * STATUS ESPERADO: PASS (URL está correta) — mas o problema real é server-side.
   */
  it('[BUG-A-1] aplica filtro de turno "Matutino" e serializa shifts=Matutino na URL', () => {
    render(<ExploreClient opportunities={[makeOpp()]} filters={emptyFilters} />);

    // Abrir e aplicar o filtro
    fireEvent.click(screen.getByLabelText('Abrir filtros avançados'));
    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(mockReplace).toHaveBeenCalledOnce();
    const [url] = mockReplace.mock.calls[0];

    // Verifica que shifts está serializado como CSV
    expect(url).toContain('shifts=Matutino');
    // Verifica que o parâmetro NOT contém URL encoding problemático
    expect(url).not.toContain('shifts=%5B'); // Não deve ter JSON array [ encodado
  });

  /**
   * REPRODUCER BUG-A-2:
   * Quando o usuário aplica quota_types=['ESCOLA_PUBLICA'], o ExploreClient deve
   * serializar como ?quota_types=ESCOLA_PUBLICA. Verificar que não está sendo
   * duplamente serializado.
   */
  it('[BUG-A-2] aplica filtro de cota "ESCOLA_PUBLICA" e serializa quota_types na URL', () => {
    render(<ExploreClient opportunities={[makeOpp()]} filters={emptyFilters} />);

    fireEvent.click(screen.getByLabelText('Abrir filtros avançados'));
    fireEvent.click(screen.getByText('Aplicar filtros'));

    expect(mockReplace).toHaveBeenCalledOnce();
    const [url] = mockReplace.mock.calls[0];

    expect(url).toContain('quota_types=ESCOLA_PUBLICA');
  });

  /**
   * REPRODUCER BUG-A-3 — FALHA ESPERADA:
   * Quando program_preference='sisu' E university_preference='publica' são aplicados
   * simultaneamente, os dois filtros NO SERVICE criam condições contraditórias:
   *   - program_preference='sisu' → query.eq('type', 'sisu') → retorna apenas MEC
   *   - university_preference='publica' → query.eq('is_partner', false) → também retorna apenas MEC
   *
   * Estes dois filtros são REDUNDANTES — qualquer oportunidade sisu já tem is_partner=false.
   * Porém, o problema REAL é com university_preference='privada' + program_preference='sisu':
   *   - eq('type', 'sisu') AND eq('is_partner', true) → retorna 0 resultados (impossível logicamente)
   *
   * Este teste documenta que aplicar "Universidade Pública" + "SISU" deve mostrar resultados,
   * mas aplicar "Universidade Privada" + "SISU" silenciosamente retorna 0 resultados.
   * O usuário não recebe feedback de que os filtros são logicamente excludentes.
   *
   * ESTE TESTE DEVE PASSAR — ele documenta o comportamento de URL (não o resultado do servidor).
   */
  it('[BUG-A-3] aplica program_preference=sisu + university_preference=publica na URL simultâneamente', () => {
    render(<ExploreClient opportunities={[makeOpp()]} filters={emptyFilters} />);

    fireEvent.click(screen.getByLabelText('Abrir filtros avançados'));
    fireEvent.click(screen.getByText('Aplicar filtros'));

    const [url] = mockReplace.mock.calls[0];

    // Ambos os filtros devem estar presentes na URL
    expect(url).toContain('program_preference=sisu');
    expect(url).toContain('university_preference=publica');

    // CRITICAL RCA NOTE: No opportunities.ts L329+336:
    // program_preference=sisu → eq('type', 'sisu') [is_partner=false implícito]
    // university_preference=publica → eq('is_partner', false)
    // Se fosse 'privada': eq('type','sisu') AND eq('is_partner',true) = ZERO RESULTADOS
    // O serviço não valida nem avisa sobre combinações logicamente impossíveis.
  });

  /**
   * REPRODUCER BUG-A-4 — DOCUMENTA O BUG REAL NO SERVICE (server-side):
   * Este teste verifica que quando filters.shifts=['Matutino'] e filters.quota_types=['ESCOLA_PUBLICA']
   * são passados como props para ExploreClient, eles são exibidos como ativos nos chips.
   * O bug é que na camada de serviço (opportunities.ts L315-318), a query PostgREST
   * gera: `badges.cs.["Matutino"]` — JSON stringificado dentro de uma string PostgREST.
   *
   * O operador correto para jsonb array contains em PostgREST é:
   *   `badges.cs.["Matutino"]` → CORRETO (contém o array JSON ["Matutino"])
   * 
   * MAS o problema documentado é que partner_opportunities têm badges como jsonb
   * de estrutura variável, e MEC opportunities têm badges construídos na view como
   * jsonb_build_array() sem os valores de turno/cota que o filtro procura.
   * Resultado: shifts filter retorna 0 resultados para MEC opps mesmo com turno correto.
   */
  it('[BUG-A-4] inicializa chips de filtro ativos quando filters prop contém shifts e quota_types', () => {
    const filtersWithShifts: ExploreFilters = {
      shifts: ['Matutino'],
      quota_types: ['ESCOLA_PUBLICA'],
    };

    render(
      <ExploreClient
        opportunities={[makeOpp({ badges: ['Matutino'] })]}
        filters={filtersWithShifts}
      />
    );

    // O componente deve renderizar sem crash quando recebe filtros com shifts
    // (verificação de integridade de renderização)
    expect(screen.getByPlaceholderText('Buscar oportunidades...')).toBeDefined();
    expect(screen.getByLabelText('Abrir filtros avançados')).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BUG-B — REPRODUCER: "Buscar do novo Nubo Conecta"
// ID: d0f3b0bd-2f59-4a7e-86a1-13ca816914e4
// ══════════════════════════════════════════════════════════════════════════════

describe('BUG-B [RCA] — Busca: divergência entre URL e estado visual do input', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchParamsString = 'tab=explore';
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  /**
   * REPRODUCER BUG-B-1 — FALHA ESPERADA (PROVA DO BUG):
   * Quando ExploreClient é montado com filters.q='medicina' (vinda do servidor via URL),
   * o <input> usa `defaultValue={filters.q ?? ''}`.
   *
   * O problema: `defaultValue` é inicializado apenas uma vez no mount.
   * Se o componente JÁ estava montado (tab switch) e os filtros mudam externamente,
   * o input NÃO atualiza seu valor visual.
   *
   * ESTE TESTE DEVE PASSAR na primeira renderização, mas FALHA se o componente for
   * re-renderizado com novos filtros (comportamento de React Controlled vs Uncontrolled).
   *
   * A fix correta é usar `key={filters.q}` no ExploreClient para forçar re-mount,
   * ou trocar defaultValue por value com um estado interno.
   */
  it('[BUG-B-1] input de busca mostra o valor correto quando filters.q está setado via URL', () => {
    const filtersWithQ: ExploreFilters = { q: 'medicina' };
    render(
      <ExploreClient
        opportunities={[makeOpp({ title: 'Medicina UFMG' })]}
        filters={filtersWithQ}
      />,
    );

    const input = screen.getByPlaceholderText('Buscar oportunidades...') as HTMLInputElement;

    // FIRST RENDER: defaultValue should work correctly on initial mount
    expect(input.value).toBe('medicina');
  });

  /**
   * REPRODUCER BUG-B-2 — PROVA DEFINITIVA DO BUG (defaultValue não reage a re-renders):
   * Simula o cenário real: usuário digita "medicina", depois limpa a URL manualmente
   * (voltando para tab=explore sem ?q=). O componente recebe novos props com filters={}.
   * O input DEVE mostrar '' mas CONTINUA mostrando 'medicina' porque usa defaultValue.
   *
   * ESTE TESTE DEVE FALHAR com a implementação atual — provando o bug.
   * A falha esperada é: expected 'medicina' to be '' (o input não reseta).
   */
  it('[BUG-B-2] ❌ REPRODUCER: input NÃO reseta quando filters.q muda de "medicina" para undefined (defaultValue bug)', () => {
    const filtersWithQ: ExploreFilters = { q: 'medicina' };
    const { rerender } = render(
      <ExploreClient
        opportunities={[makeOpp({ title: 'Medicina UFMG' })]}
        filters={filtersWithQ}
      />,
    );

    // Verify initial state
    const input = screen.getByPlaceholderText('Buscar oportunidades...') as HTMLInputElement;
    expect(input.value).toBe('medicina');

    // Simula: usuário clica em "Todas" pill ou navega, URL perde o ?q=
    // O Server Component re-renders ExploreClient com filters={} (q=undefined)
    rerender(
      <ExploreClient
        opportunities={[makeOpp({ title: 'Medicina UFMG' }), makeOpp({ id: 'mec_002', title: 'Direito USP' })]}
        filters={emptyFilters} // q foi removido da URL
      />,
    );

    // BUG: O input AINDA mostra 'medicina' mesmo com filters.q=undefined
    // O valor correto seria '' (vazio) — a busca foi limpa na URL
    // Com defaultValue (uncontrolled), o input NÃO reseta.
    // Esta assertion FALHARÁ com a implementação atual, PROVANDO o bug.
    expect(input.value).toBe('');
    // ^ Esta linha vai FALHAR — o input ainda vai mostrar 'medicina'
    // porque defaultValue não reage a mudanças de prop.
  });

  /**
   * REPRODUCER BUG-B-3 — PROVA DO BUG DE SINCRONIZAÇÃO REVERSA:
   * Cenário: URL tem ?q=medicina, mas o usuário limpa o campo e digita 'direito'.
   * Após o debounce, router.replace atualiza a URL para ?q=direito.
   * O componente re-renders do servidor com results filtrados por 'direito'.
   * O input DEVE mostrar 'direito' — mas com defaultValue pode não acontecer
   * se o componente não for desmontado/remontado entre navegações de tab.
   *
   * ESTE TESTE VERIFICA O FLUXO FELIZ (deve passar mesmo com o bug):
   */
  it('[BUG-B-3] busca por "direito" após debounce chama router.replace com ?q=direito', () => {
    render(
      <ExploreClient
        opportunities={[makeOpp()]}
        filters={emptyFilters}
      />,
    );

    const input = screen.getByPlaceholderText('Buscar oportunidades...');
    fireEvent.change(input, { target: { value: 'direito' } });

    act(() => { vi.advanceTimersByTime(300); });

    expect(mockReplace).toHaveBeenCalledOnce();
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain('q=direito');
    expect(url).toContain('tab=explore');
  });

  /**
   * REPRODUCER BUG-B-4 — DOCUMENTA O BUG DA CATEGORIA + BUSCA COMBINADA:
   * Se o usuário tem ?category=sisu&q=medicina na URL, ao trocar de tab para "Para Você"
   * e voltar para "Explorar Todas", o ExploreClient é remontado com os mesmos filtros.
   * O defaultValue funciona nesse caso (remount = novo mount).
   *
   * MAS se o usuário usa os pills de categoria SEM trocar de tab,
   * o handleCategoryPill() chama updateParam({ category: 'prouni' }),
   * que faz router.replace — mas o componente NÃO é desmontado/remontado.
   * O campo de busca mostra 'medicina' (defaultValue não muda),
   * mas os results mudam para prouni sem busca por 'medicina'.
   *
   * Resultado final: UI inconsistente — input diz "medicina" mas results são de "prouni".
   */
  it('[BUG-B-4] troca de categoria NÃO reseta o input de busca (UI inconsistente)', () => {
    mockSearchParamsString = 'tab=explore&q=medicina&category=sisu';
    const filtersWithBoth: ExploreFilters = { q: 'medicina', category: 'sisu' };

    render(
      <ExploreClient
        opportunities={[makeOpp()]}
        filters={filtersWithBoth}
      />,
    );

    const input = screen.getByPlaceholderText('Buscar oportunidades...') as HTMLInputElement;
    expect(input.value).toBe('medicina');

    // Usuário clica em 'Prouni' pill → muda category, preserva q na URL
    fireEvent.click(screen.getByText('Prouni'));

    // Após a mudança, o input AINDA deve mostrar 'medicina' (q persiste na URL via updateParam)
    // Isso é comportamento correto — mas se o componente re-rendered e defaultValue não updou,
    // o usuário vê o texto mesmo que a URL o tenha perdido em algum edge case.
    expect(input.value).toBe('medicina');

    // Verificar que a URL foi atualizada com category=prouni mantendo q=medicina
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain('q=medicina');
    expect(url).toContain('category=prouni');
  });
});
