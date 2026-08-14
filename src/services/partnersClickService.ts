import { supabase } from '@/lib/supabase';
import { ATTR_COOKIES } from '@/lib/attribution';

// Clique em card — TP-2 2b / ADR-0022.
//
// Dual-write durante o expand/contract: escreve na fonte nova
// (engagement_events) e mantém a antiga (partners_click), que vw_partner_funnel
// ainda lê. A antiga só para de receber quando o consumidor migrar.
//
// A fonte nova é agnóstica, então este serviço passa a registrar clique em card
// de oportunidade MEC também — hoje impossível, porque partners_click tem
// partner_id NOT NULL apontando para partner_opportunities.

interface RegisterClickOptions {
  /** id sintético de v_unified_opportunities ('mec_<uuid>' / 'partner_<uuid>'). */
  unifiedOpportunityId?: string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[:.]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export async function registerPartnerClick(
  partnerId: string | null,
  options: RegisterClickOptions = {},
): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const anonymousId = readCookie(ATTR_COOKIES.anonymous);
    const subjectId = user?.id ?? anonymousId;
    if (!subjectId) {
      return { error: 'Missing click subject' };
    }

    const isPartner = Boolean(partnerId);

    // ── Fonte nova ───────────────────────────────────────────────────────────
    // A RPC é a única porta que aceita sessão anônima: valida sujeito/entidade,
    // limita volume e preserva a idempotência.
    const entityKey = partnerId ?? options.unifiedOpportunityId ?? 'unknown';
    const { data: eventResult, error: eventError } = await (supabase.rpc as any)(
      'record_card_click',
      {
        p_event_id: `card_click:${subjectId}:${entityKey}:${new Date().toISOString().slice(0, 16)}`,
        p_entity_type: isPartner ? 'partner_opportunity' : 'mec_opportunity',
        p_entity_id: partnerId,
        p_unified_opportunity_id: options.unifiedOpportunityId ?? null,
        p_source: 'card',
        p_anonymous_id: anonymousId,
      });

    if (eventError) {
      console.error('Error registering engagement event:', eventError);
      return { error: eventError };
    }

    const eventStatus = (eventResult as { status?: string } | null)?.status;
    if (eventStatus !== 'created' && eventStatus !== 'duplicate') {
      const error = { message: `record_card_click returned ${eventStatus ?? 'unknown'}` };
      console.error('Error registering engagement event:', error);
      return { error };
    }

    // ── Fonte antiga (só parceiro; a FK exige) ───────────────────────────────
    // Anônimo não tem user_id para a tabela legada; o evento novo será
    // costurado no login.
    if (!isPartner || !user) {
      return { error: null };
    }

    const { data, error: fetchError } = await supabase
      .from('partners_click')
      .select('id, clicks')
      .eq('user_id', user.id)
      .eq('partner_id', partnerId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
      console.error('Error fetching partner click:', fetchError);
      return { error: fetchError };
    }

    if (data) {
      const { error: updateError } = await supabase
        .from('partners_click')
        .update({ clicks: data.clicks + 1 })
        .eq('id', data.id);

      return { error: updateError };
    }

    const { error: insertError } = await supabase
      .from('partners_click')
      .insert({
        user_id: user.id,
        partner_id: partnerId,
        clicks: 1,
      });

    return { error: insertError };
  } catch (error) {
    console.error('Unexpected error registering partner click:', error);
    return { error };
  }
}
