// Detecção e enfileiramento de card_view — TP-2 2a task 2.
//
// Semântica definida no plano: o card conta como visto quando **≥50% dele fica
// visível por ≥1s**. Os dois critérios importam. Só interseção contaria card
// que passou voando durante um scroll rápido; só tempo contaria card fora da
// tela numa aba de fundo.
//
// Deduplicação por sessão + entidade + janela: rolar a mesma lista para cima e
// para baixo não multiplica o evento. A janela é de 30 minutos — a mesma pessoa
// revendo o mesmo card meia hora depois é interesse novo, não ruído.
//
// O envio é em LOTE. Uma tela de catálogo mostra ~15 cards; sem batching seriam
// 15 requisições concorrentes só para registrar que a lista apareceu.

export const CARD_VIEW_VISIBLE_RATIO = 0.5;
export const CARD_VIEW_DWELL_MS = 1000;

/** Janela de dedupe. Compõe o event_id, então é o banco que garante. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/** Espera antes de despachar, para agrupar os cards que aparecem juntos. */
const FLUSH_DELAY_MS = 1500;

/** Teto por lote — espelha o c_max_batch da RPC. */
const MAX_BATCH = 50;

export type CardEntityType =
  | 'partner_opportunity'
  | 'mec_opportunity'
  | 'institution'
  | 'course';

export interface CardViewTarget {
  entityType: CardEntityType;
  entityId?: string | null;
  unifiedOpportunityId?: string | null;
  /** Tela onde o card apareceu: 'catalogo', 'home_carrossel', 'match'… */
  surface: string;
}

interface QueuedView extends CardViewTarget {
  event_id: string;
}

type Flusher = (views: QueuedView[]) => Promise<void>;

const queue: QueuedView[] = [];
/** Já enfileirados nesta janela — evita trabalho antes mesmo de ir ao banco. */
const seen = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flusher: Flusher | null = null;

/** Injetado pelo provider; deixa este módulo testável sem rede. */
export function setCardViewFlusher(fn: Flusher | null) {
  flusher = fn;
}

export function buildEventId(target: CardViewTarget, subjectId: string): string {
  const entity = target.entityId ?? target.unifiedOpportunityId ?? 'unknown';
  const window = Math.floor(Date.now() / DEDUPE_WINDOW_MS);
  return `view:${subjectId}:${entity}:${window}`;
}

export function enqueueCardView(target: CardViewTarget, subjectId: string): void {
  const eventId = buildEventId(target, subjectId);
  if (seen.has(eventId)) return;
  seen.add(eventId);

  queue.push({ ...target, event_id: eventId });

  // Lote cheio despacha na hora: segurar mais só aumentaria a chance de perder
  // tudo se a pessoa fechar a aba.
  if (queue.length >= MAX_BATCH) {
    void flush();
    return;
  }

  if (timer) return;
  timer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || !flusher) return;

  const batch = queue.splice(0, MAX_BATCH);

  try {
    await flusher(batch);
  } catch {
    // Telemetria que falha não pode quebrar a navegação nem virar retry
    // infinito. O evento perdido custa uma linha de métrica.
  }
}

/** Só para os testes: zera fila, dedupe e timer entre casos. */
export function __resetCardViewQueue() {
  queue.length = 0;
  seen.clear();
  if (timer) clearTimeout(timer);
  timer = null;
  flusher = null;
}
