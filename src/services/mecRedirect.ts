// Redirect MEC fail-open — NUB-RD-96 (TP-H §3 96a).
//
// Cliente (sem 'use server'): orquestra a server action `trackAndRedirect`, que
// continua ESTRITA para o fluxo partner-forms (sem registro confirmado, sem URL).
// Aqui a regra é a inversa: o registro é tentado ANTES de a janela ir para o
// portal oficial, mas erro ou demora do tracking nunca impede a pessoa de
// chegar ao destino.

import { trackAndRedirect } from '@/services/redirectService';

/** Teto de espera pelo tracking antes de seguir para o portal. */
export const REDIRECT_TRACKING_TIMEOUT_MS = 1500;

export interface TrackRedirectParams {
  /** auth.uid() — o RLS de engagement_events exige user_id = auth.uid(). Nunca o perfil ativo. */
  userId: string;
  /** id sintético de v_unified_opportunities ('mec_<uuid>'). */
  unifiedOpportunityId: string;
  destinationUrl: string;
  /** `apply:<surface>` — ver `applySource` em '@/lib/surfaces'. */
  source: string;
}

export type TrackRedirectResult =
  | { tracked: true }
  | { tracked: false; reason: 'error' | 'timeout' };

/**
 * Registra o redirect MEC e resolve em até `timeoutMs`. NUNCA rejeita: o
 * resultado diz se o evento foi confirmado, e o caller navega de qualquer jeito.
 *
 * No timeout o insert segue vivo no servidor e pode ainda ser gravado (o
 * event_id por minuto o torna idempotente); só deixamos de esperar por ele.
 */
export async function trackRedirectFailOpen(
  params: TrackRedirectParams,
  timeoutMs: number = REDIRECT_TRACKING_TIMEOUT_MS,
): Promise<TrackRedirectResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<TrackRedirectResult>((resolve) => {
    timer = setTimeout(() => resolve({ tracked: false, reason: 'timeout' }), timeoutMs);
  });

  const tracking: Promise<TrackRedirectResult> = trackAndRedirect(
    params.userId,
    null, // MEC não tem partner_id
    params.destinationUrl,
    params.source,
    params.unifiedOpportunityId,
  ).then(
    (): TrackRedirectResult => ({ tracked: true }),
    (error: unknown): TrackRedirectResult => {
      console.warn('[mecRedirect] tracking failed, following the redirect anyway:', error);
      return { tracked: false, reason: 'error' };
    },
  );

  try {
    const result = await Promise.race([tracking, timeout]);
    if (!result.tracked && result.reason === 'timeout') {
      console.warn(`[mecRedirect] tracking exceeded ${timeoutMs}ms, following the redirect anyway`);
    }
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

interface NavigationEnv {
  open: (url: string, target: string) => Window | null;
  assign: (url: string) => void;
}

/**
 * Leva a pessoa ao destino. `preOpened` é a janela aberta DENTRO do gesto do
 * clique (antes de qualquer await), que é o que evita o bloqueador de pop-up.
 *
 * Sem janela utilizável: tenta abrir com a URL final e, bloqueado de novo, o
 * último recurso é navegar a própria aba — nunca fica sem destino.
 */
export function navigateToDestination(
  preOpened: Window | null,
  url: string,
  env: NavigationEnv = {
    open: (u, t) => window.open(u, t),
    assign: (u) => window.location.assign(u),
  },
): void {
  if (preOpened && !preOpened.closed) {
    preOpened.location.href = url;
    return;
  }
  const fallback = env.open(url, '_blank');
  if (!fallback) env.assign(url);
}
