// matchService — Sprint 03 Épico 1B
// Client-side service that calls the calculate_match RPC and reads user_opportunity_matches.
// Uses the browser Supabase client — safe for "use client" components.

import { supabase } from '@/lib/supabase';

export interface MatchResult {
  unified_opportunity_id: string;
  match_score: number;
  match_details: Record<string, number>;
}

/**
 * Calls the calculate_match RPC which:
 *   1. Deletes existing matches for the profile
 *   2. Scores every row in v_unified_opportunities
 *   3. Inserts + returns results ordered by score DESC
 */
export async function generateMatch(profileId: string): Promise<MatchResult[]> {
  const { data, error } = await supabase.rpc('calculate_match', {
    p_profile_id: profileId,
  });

  if (error) throw new Error(`generateMatch RPC failed: ${error.message}`);
  return (data as MatchResult[]) ?? [];
}

/**
 * Reads previously generated matches from user_opportunity_matches.
 * Returns empty array if the profile has no matches yet.
 */
export async function getMatchResults(profileId: string): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from('user_opportunity_matches')
    .select('unified_opportunity_id, match_score, match_details')
    .eq('profile_id', profileId)
    .order('match_score', { ascending: false });

  if (error) throw new Error(`getMatchResults failed: ${error.message}`);
  return (data as MatchResult[]) ?? [];
}
