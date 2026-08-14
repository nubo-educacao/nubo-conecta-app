'use client';

// useCardView — TP-2 2a task 2.
//
// Devolve uma ref para pendurar no elemento raiz do card. Enquanto ≥50% dele
// estiver visível por ≥1s, o card é enfileirado como visto.
//
// Fica DENTRO dos componentes de card (OpportunityCard, InstitutionCard,
// item de match) e não nas telas. É o que faz o card_view valer em toda tela
// onde um card apareça — inclusive nas que ainda não existem. Instrumentar por
// tela seria garantir que a próxima nasça sem métrica.

import { useEffect, useRef } from 'react';
import {
  CARD_VIEW_DWELL_MS,
  CARD_VIEW_VISIBLE_RATIO,
  enqueueCardView,
  type CardViewTarget,
} from '@/lib/cardView';
import { useAuth } from '@/contexts/AuthContext';
import { ATTR_COOKIES } from '@/lib/attribution';

/**
 * Sujeito da deduplicação: o usuário, quando há sessão; a identidade anônima,
 * quando não há. Sem sujeito não dá para deduplicar, e o hook não registra —
 * melhor não ter o evento do que ter um evento que não se sabe de quem é.
 */
export function useViewSubject(): string | null {
  const { user } = useAuth();
  if (user?.id) return user.id;
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + ATTR_COOKIES.anonymous.replace(/[:.]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function useCardView<T extends HTMLElement = HTMLDivElement>(
  target: CardViewTarget | null,
  subjectId: string | null,
) {
  const ref = useRef<T | null>(null);

  // Guardado em ref para não recriar o observer a cada render do card — a lista
  // inteira re-renderiza a cada filtro, e recriar observers em lista longa
  // custa mais que o próprio tracking.
  const latest = useRef({ target, subjectId });
  latest.current = { target, subjectId };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false;

    const cancel = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (done) return;

          if (entry.intersectionRatio >= CARD_VIEW_VISIBLE_RATIO) {
            // Só arma o cronômetro. Sair da tela antes de 1s cancela — é o que
            // separa "viu" de "passou raspando durante o scroll".
            if (!dwellTimer) {
              dwellTimer = setTimeout(() => {
                const { target: t, subjectId: s } = latest.current;
                if (t && s) {
                  enqueueCardView(t, s);
                  done = true;
                  observer.disconnect();
                }
              }, CARD_VIEW_DWELL_MS);
            }
          } else {
            cancel();
          }
        }
      },
      { threshold: [CARD_VIEW_VISIBLE_RATIO] },
    );

    observer.observe(node);

    return () => {
      cancel();
      observer.disconnect();
    };
    // Sem dependências: o observer é montado uma vez por card. As mudanças de
    // target/subject são lidas via ref no momento do disparo.
  }, []);

  return ref;
}
