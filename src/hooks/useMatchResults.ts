'use client';

// useMatchResults — Sprint 03 Épico 1B
// Manages match state: idle → loading → done | error
// Exposes loadExisting() to hydrate from DB and runMatch() to trigger RPC.

import { useState, useCallback } from 'react';
import {
  generateMatch,
  getMatchResults,
  type MatchResult,
} from '@/services/matchService';

type MatchState = 'idle' | 'loading' | 'done' | 'error';

export function useMatchResults(profileId: string | null) {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadExisting = useCallback(async () => {
    if (!profileId) return;
    setMatchState('loading');
    setError(null);
    try {
      const data = await getMatchResults(profileId);
      setResults(data);
      setMatchState(data.length > 0 ? 'done' : 'idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar matches.');
      setMatchState('error');
    }
  }, [profileId]);

  const runMatch = useCallback(async () => {
    if (!profileId) return;
    setMatchState('loading');
    setError(null);
    try {
      const data = await generateMatch(profileId);
      setResults(data);
      setMatchState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar match.');
      setMatchState('error');
    }
  }, [profileId]);

  return { results, matchState, error, runMatch, loadExisting };
}
