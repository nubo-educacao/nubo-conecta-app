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
