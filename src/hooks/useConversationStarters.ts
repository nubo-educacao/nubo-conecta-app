'use client';

// useConversationStarters — Sprint 03 Épico 1C
// Fetches starters for the current page route from cloudinha_starters.
// Falls back to hardcoded defaults when DB is unreachable or no row exists.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StartersData {
  intro_message: string;
  starters: string[];
}

const FALLBACK: StartersData = {
  intro_message: 'Oi! Sou a Cloudinha, sua guia educacional. Como posso te ajudar hoje?',
  starters: [
    'Quais são as melhores bolsas para mim?',
    'Como funciona o Sisu?',
    'Me ajude a encontrar um curso',
  ],
};

export function useConversationStarters(pageRoute: string): StartersData & { loading: boolean } {
  const [data, setData] = useState<StartersData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('cloudinha_starters')
      .select('intro_message, starters')
      .eq('page_route', pageRoute)
      .eq('is_active', true)
      .order('route_priority', { ascending: false })
      .limit(1)
      .single()
      .then(({ data: row }) => {
        if (cancelled) return;
        if (row) {
          setData({
            intro_message: row.intro_message ?? FALLBACK.intro_message,
            starters: Array.isArray(row.starters) ? row.starters : FALLBACK.starters,
          });
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageRoute]);

  return { ...data, loading };
}
