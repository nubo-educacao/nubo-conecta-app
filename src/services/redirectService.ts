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
 * @param partnerId  - Institution UUID. NULO para oportunidade MEC — e agora
 *                     isso deixa de significar "não rastrear".
 * @param redirectUrl - The destination URL
 * @param source     - Context identifier (e.g. 'catalog_card', 'opportunity_detail')
 * @param unifiedOpportunityId - id sintético de v_unified_opportunities
 *                     ('mec_<uuid>' / 'partner_<uuid>'). É o que identifica a
 *                     oportunidade MEC, que não tem partner_id.
 */
export async function trackAndRedirect(
  userId: string,
  partnerId: string | null,
  redirectUrl: string,
  source: string,
  unifiedOpportunityId?: string | null,
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

  // ── Fonte nova: engagement_events (TP-2 2a / ADR-0022) ────────────────────
  //
  // O guard que existia aqui pulava o tracking inteiro quando partnerId era
  // null — e era exatamente por isso que oportunidade MEC nunca foi rastreada.
  // A tabela nova é agnóstica: não exige parceiro, então o redirect de MEC
  // passa a existir como dado pela primeira vez.
  const isPartner = Boolean(partnerId);

  const { error: eventError } = await supabase
    .from('engagement_events')
    .insert({
      // Idempotente por usuário + destino + minuto: duplo clique no botão não
      // vira dois redirects, mas voltar depois vira.
      event_id: `redirect:${userId}:${redirectUrl}:${new Date().toISOString().slice(0, 16)}`,
      event_type: 'redirect',
      user_id: userId,
      entity_type: isPartner ? 'partner_opportunity' : 'mec_opportunity',
      entity_id: partnerId,
      unified_opportunity_id: unifiedOpportunityId ?? null,
      destination_url: redirectUrl,
      source,
    });

  // O contrato duro continua valendo: sem registro confirmado, a URL não é
  // devolvida. É o que impede alguém contornar o tracking (requisito de
  // segurança do TDD da Sprint 02).
  if (eventError && eventError.code !== '23505') {
    throw new Error(`trackAndRedirect: failed to record event [source=${source}]: ${eventError.message}`);
  }

  // ── Fonte antiga: dual-write durante o expand/contract ─────────────────────
  // vw_partner_funnel, get_admin_funnel_users, get_partner_redirect_users e
  // get_student_details_v2 ainda leem daqui. Só para de escrever quando todos
  // tiverem migrado. A FK exige parceiro, então MEC não entra — e não precisa:
  // o evento já foi registrado acima.
  if (isPartner) {
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
  }

  // Only return URL after confirmed INSERT
  return { url: redirectUrl };
}
