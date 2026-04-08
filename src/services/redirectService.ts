'use server';
// Server Action: trackAndRedirect
// HARD CONTRACT: INSERT into external_redirect_clicks BEFORE returning the URL.
// If the INSERT fails, the function throws — the caller NEVER receives the redirect URL.
// This prevents bypass of click tracking (security requirement from Sprint 02 TDD plan).
// PLAYBOOK § 2: Server Actions for mutations.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface TrackAndRedirectResult {
  url: string;
}

/**
 * Tracks an external redirect click and returns the destination URL.
 *
 * INVARIANT: The database INSERT must succeed before the URL is returned.
 * Any INSERT failure causes a thrown Error — the caller must handle this
 * and show an appropriate error state rather than silently redirecting.
 *
 * @param userId     - Authenticated user's UUID
 * @param partnerId  - Institution UUID (nullable for non-partner opportunities)
 * @param redirectUrl - The destination URL
 * @param source     - Context identifier (e.g. 'catalog_card', 'opportunity_detail')
 */
export async function trackAndRedirect(
  userId: string,
  partnerId: string | null,
  redirectUrl: string,
  source: string,
): Promise<TrackAndRedirectResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  // INSERT FIRST — this must complete before the URL is returned
  const { error } = await supabase
    .from('external_redirect_clicks')
    .insert({
      user_id:      userId,
      partner_id:   partnerId,
      redirect_url: redirectUrl,
      source,
    });

  if (error) {
    // Fail Fast, Fail Loud (PLAYBOOK § 1)
    throw new Error(`trackAndRedirect: failed to record click [source=${source}]: ${error.message}`);
  }

  // Only return URL after confirmed INSERT
  return { url: redirectUrl };
}
