import { supabase } from '@/lib/supabase';

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

export async function registerPartnerClick(
  partnerId: string | null,
  options: RegisterClickOptions = {},
): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const isPartner = Boolean(partnerId);

    // ── Fonte nova ───────────────────────────────────────────────────────────
    // event_id por usuário + entidade + minuto: clicar duas vezes no mesmo card
    // enquanto a página carrega não vira dois cliques.
    const entityKey = partnerId ?? options.unifiedOpportunityId ?? 'unknown';
    const { error: eventError } = await supabase
      .from('engagement_events')
      .insert({
        event_id: `card_click:${user.id}:${entityKey}:${new Date().toISOString().slice(0, 16)}`,
        event_type: 'card_click',
        user_id: user.id,
        entity_type: isPartner ? 'partner_opportunity' : 'mec_opportunity',
        entity_id: partnerId,
        unified_opportunity_id: options.unifiedOpportunityId ?? null,
        source: 'card',
      });

    // 23505 é violação de unicidade do event_id — ou seja, o clique já foi
    // registrado. Não é erro: é a idempotência funcionando.
    if (eventError && eventError.code !== '23505') {
      console.error('Error registering engagement event:', eventError);
    }

    // ── Fonte antiga (só parceiro; a FK exige) ───────────────────────────────
    if (!isPartner) {
      return { error: eventError && eventError.code !== '23505' ? eventError : null };
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
