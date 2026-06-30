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

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  // 2. Fetch form mapping for the opportunity
  let prefilledAnswers: Record<string, any> = {};

  if (profile) {
    const { data: fields } = await supabase
      .from('partner_forms')
      .select('*')
      .eq('partner_id', partnerOppId);

    if (fields) {
      fields.forEach((field: any) => {
        if (field.mapping_source && field.mapping_source.startsWith('user_profiles.')) {
          const column = field.mapping_source.split('.')[1];
          const value = profile[column];
          if (value !== undefined && value !== null) {
            prefilledAnswers[field.field_name] = value;
          }
        }
      });
    }
  }

  // 3. Create application with prefilled answers
  const { data, error } = await supabase
    .from('student_applications')
    .insert({
      user_id: profileId,
      partner_id: partnerOppId,
      status: 'DRAFT',
      answers: prefilledAnswers,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createApplication] Error:', error?.message);
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

