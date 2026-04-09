// profileService — Sprint 4.5 (BUG-004)
// Wraps upserts for user_profiles, user_income e user_preferences.
// Schema-verified:
//   user_profiles.id      = auth UUID (PK)
//   user_preferences.user_id = FK (UNIQUE)
//   user_income.user_id      = FK (UNIQUE)
//   user_preferences: program_preference ∈ {'sisu','prouni','indiferente'}
//   user_preferences: university_preference ∈ {'publica','privada','indiferente'}

import { supabase } from '@/lib/supabase';

export interface UserProfileData {
  full_name?: string | null;
  birth_date?: string | null;    // 'YYYY-MM-DD'
  age?: number | null;
  education?: string | null;
  education_year?: string | null;
  zip_code?: string | null;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  street_number?: string | null;
  complement?: string | null;
  country?: string | null;
  outside_brazil?: boolean;
  onboarding_completed?: boolean;
}

export interface UserIncomeData {
  family_count?: number | null;
  social_benefits?: number | null;
  alimony?: number | null;
  member_incomes?: number[];
  per_capita_income?: number | null;
}

export interface UserPreferencesData {
  enem_score?: number | null;
  course_interest?: string[] | null;
  family_income_per_capita?: number | null;
  quota_types?: string[] | null;
  preferred_shifts?: string[] | null;
  // Must match DB check constraint: 'sisu' | 'prouni' | 'indiferente'
  program_preference?: string | null;
  // Must match DB check constraint: 'publica' | 'privada' | 'indiferente'
  university_preference?: string | null;
  location_preference?: string | null;
  state_preference?: string | null;
}

export async function saveUserData(userId: string, data: UserProfileData): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: userId, ...data }, { onConflict: 'id' });

  if (error) throw new Error(`saveUserData: ${error.message}`);
}

export async function saveUserIncome(userId: string, income: UserIncomeData): Promise<void> {
  const { error } = await supabase
    .from('user_income')
    .upsert({ user_id: userId, ...income }, { onConflict: 'user_id' });

  if (error) throw new Error(`saveUserIncome: ${error.message}`);
}

export async function saveUserPreferences(userId: string, prefs: UserPreferencesData): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });

  if (error) throw new Error(`saveUserPreferences: ${error.message}`);
}

// Sets onboarding_completed = true in Supabase Auth user_metadata.
// AuthContext.onAuthStateChange propagates the update automatically.
export async function markOnboardingComplete(): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  });

  if (error) throw new Error(`markOnboardingComplete: ${error.message}`);
}
