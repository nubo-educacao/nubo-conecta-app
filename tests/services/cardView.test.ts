// TP-2 2a task 2 — fila e deduplicação de card_view.
// Card eeb42964.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildEventId,
  enqueueCardView,
  flush,
  setCardViewFlusher,
  __resetCardViewQueue,
  CARD_VIEW_VISIBLE_RATIO,
  CARD_VIEW_DWELL_MS,
  type CardViewTarget,
} from '@/lib/cardView';

const card = (id: string): CardViewTarget => ({
  entityType: 'mec_opportunity',
  unifiedOpportunityId: id,
  surface: 'catalogo',
});

beforeEach(() => {
  __resetCardViewQueue();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  __resetCardViewQueue();
});

describe('semântica definida no plano', () => {
  it('exige ≥50% visível e ≥1s de permanência', () => {
    // Os dois critérios importam: só interseção contaria card que passou
    // voando no scroll; só tempo contaria card fora da tela.
    expect(CARD_VIEW_VISIBLE_RATIO).toBe(0.5);
    expect(CARD_VIEW_DWELL_MS).toBe(1000);
  });
});

describe('deduplicação', () => {
  it('mesma entidade + mesmo sujeito + mesma janela = mesmo event_id', () => {
    expect(buildEventId(card('mec_1'), 'sess-a')).toBe(buildEventId(card('mec_1'), 'sess-a'));
  });

  it('sujeitos diferentes geram event_id diferente', () => {
    expect(buildEventId(card('mec_1'), 'sess-a')).not.toBe(buildEventId(card('mec_1'), 'sess-b'));
  });

  it('entidades diferentes geram event_id diferente', () => {
    expect(buildEventId(card('mec_1'), 'sess-a')).not.toBe(buildEventId(card('mec_2'), 'sess-a'));
  });

  it('rolar a mesma lista de novo não reenfileira', () => {
    const sent: unknown[][] = [];
    setCardViewFlusher(async (v) => { sent.push(v); });

    enqueueCardView(card('mec_1'), 'sess-a');
    enqueueCardView(card('mec_1'), 'sess-a');
    enqueueCardView(card('mec_1'), 'sess-a');

    vi.runAllTimers();

    expect(sent[0]).toHaveLength(1);
  });
});

describe('envio em lote', () => {
  it('agrupa os cards que aparecem juntos numa chamada só', async () => {
    // Uma tela de catálogo mostra ~15 cards. Sem batching seriam 15
    // requisições concorrentes só para dizer que a lista apareceu.
    const sent: unknown[][] = [];
    setCardViewFlusher(async (v) => { sent.push(v); });

    for (let i = 0; i < 12; i++) enqueueCardView(card(`mec_${i}`), 'sess-a');

    expect(sent).toHaveLength(0); // ainda não despachou

    await vi.runAllTimersAsync();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toHaveLength(12);
  });

  it('despacha na hora quando o lote enche, sem esperar o timer', async () => {
    const sent: unknown[][] = [];
    setCardViewFlusher(async (v) => { sent.push(v); });

    for (let i = 0; i < 50; i++) enqueueCardView(card(`mec_${i}`), 'sess-a');

    // Segurar mais só aumentaria a chance de perder tudo se a aba fechar.
    expect(sent).toHaveLength(1);
    expect(sent[0]).toHaveLength(50);
  });

  it('flush sem nada na fila não chama o banco', async () => {
    const flusher = vi.fn();
    setCardViewFlusher(flusher);

    await flush();

    expect(flusher).not.toHaveBeenCalled();
  });
});

describe('resiliência', () => {
  it('falha de telemetria não propaga', async () => {
    // Métrica que quebra a navegação é pior que métrica que falta.
    setCardViewFlusher(async () => { throw new Error('rede caiu'); });

    enqueueCardView(card('mec_1'), 'sess-a');

    await expect(vi.runAllTimersAsync()).resolves.not.toThrow();
  });

  it('sem flusher registrado, não quebra nem perde a fila', async () => {
    enqueueCardView(card('mec_1'), 'sess-a');
    await flush();

    const sent: unknown[][] = [];
    setCardViewFlusher(async (v) => { sent.push(v); });
    await flush();

    expect(sent[0]).toHaveLength(1);
  });
});
