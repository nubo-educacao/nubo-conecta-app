'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * createApplication — Server Action
 * Creates a student_application record for a partner opportunity.
 * Called from DetailsLayout CTA button.
 */
export async function createApplication(
  partnerOppId: string,
  profileId: string,
): Promise<{ id: string }> {
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

  const { data, error } = await supabase
    .from('student_applications')
    .insert({
      user_id: profileId,
      partner_id: partnerOppId,
      status: 'DRAFT',
      answers: {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Erro ao iniciar candidatura');
  }

  return { id: data.id };
}

/**
 * getExistingApplication — Server Action
 * Fetches an existing student_application record by user profile ID and partner opportunity ID.
 */
export async function getExistingApplication(
  partnerOppId: string,
  profileId: string,
): Promise<{ id: string; status: string; redirect_url?: string | null } | null> {
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

  const { data, error } = await supabase
    .from('student_applications')
    .select('id, status, redirect_url:answers->>redirect_url')
    .eq('user_id', profileId)
    .eq('partner_id', partnerOppId)
    .maybeSingle();

  if (error) {
    console.error('[getExistingApplication] Error fetching:', error.message);
    return null;
  }

  return data;
}

