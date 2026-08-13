'use client';

// Liga a fila de card_view ao banco e ao ciclo de vida da página.
// Montado uma vez, no AppShell. TP-2 2a task 2.

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { flush, setCardViewFlusher } from '@/lib/cardView';
import { ATTR_COOKIES } from '@/lib/attribution';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[:.]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export default function CardViewTracker() {
  const { user } = useAuth();

  useEffect(() => {
    setCardViewFlusher(async (views) => {
      const anonymousId = readCookie(ATTR_COOKIES.anonymous);

      // Sem sujeito não há como deduplicar nem atribuir; o evento seria ruído.
      if (!user?.id && !anonymousId) return;

      await supabase.rpc('record_card_views', {
        p_views: views.map((v) => ({
          event_id: v.event_id,
          entity_type: v.entityType,
          entity_id: v.entityId ?? null,
          unified_opportunity_id: v.unifiedOpportunityId ?? null,
          surface: v.surface,
        })),
        p_anonymous_id: anonymousId,
      });
    });

    return () => setCardViewFlusher(null);
  }, [user?.id]);

  useEffect(() => {
    // Descarrega o que estiver na fila quando a aba sai de vista. `pagehide` e
    // `visibilitychange` pegam o fechamento em mobile, onde `beforeunload` é
    // pouco confiável — e é justamente aí que a fila costuma ter conteúdo.
    const onHide = () => void flush();

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, []);

  return null;
}
