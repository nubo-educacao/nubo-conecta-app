// Reivindicação de evento de conversão — NUB-RD-85 (TP-7, R1–R4).
//
// Quem decide se um Lead / CompleteRegistration aconteceu é o SERVIDOR
// (RPC claim_conversion_event, migration nubo-conecta-admin
// 20261015140000_conversion_event_claims.sql), não o evento de auth:
// `SIGNED_IN` sai também em login de conta existente, em outra aba e ao
// recuperar a sessão numa página nova.
//
// O `event_id` vem de lá: aleatório, gerado uma vez por evento lógico, sem
// relação com o id da pessoa — e o mesmo que um envio server-side futuro
// (CAPI, fora de escopo) encontrará na tabela para deduplicar.

import { supabase } from '@/lib/supabase';

export type ConversionKind = 'lead' | 'complete_registration';

export interface ConversionClaim {
    eventId: string;
    shouldEmit: boolean;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function newRequestId(): string {
    return globalThis.crypto.randomUUID();
}

/**
 * Pede ao servidor o direito de emitir o evento.
 *
 * `null` = não há evento a emitir (conta anterior ao corte, não confirmada,
 * onboarding não persistido) ou o servidor não respondeu. Nunca lança: perder
 * uma conversão custa uma linha de relatório; quebrar o login ou o onboarding
 * custa a pessoa.
 *
 * Retry de transporte reusa o MESMO request_id: se o primeiro pedido chegou a
 * gravar e só a resposta se perdeu, o servidor reconhece o pedido e devolve o
 * mesmo event_id com permissão de emitir — nem perde, nem duplica.
 */
export async function claimConversionEvent(kind: ConversionKind): Promise<ConversionClaim | null> {
    const requestId = newRequestId();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { data, error } = await supabase.rpc('claim_conversion_event', {
                p_kind: kind,
                p_request_id: requestId,
            });

            if (!error) {
                const row = (data as Array<{ event_id: string; should_emit: boolean }> | null)?.[0];
                return row ? { eventId: row.event_id, shouldEmit: row.should_emit === true } : null;
            }

            // Erro de transporte vem como status 0 / sem code; erro do banco
            // (permissão, função ausente antes do deploy da migration) não
            // melhora com retry.
            const transport = !error.code;
            if (!transport || attempt === MAX_ATTEMPTS) {
                console.error(`[conversion] claim ${kind} recusado`, error.code ?? error.message);
                return null;
            }
        } catch (err) {
            if (attempt === MAX_ATTEMPTS) {
                console.error(`[conversion] claim ${kind} sem resposta`, err);
                return null;
            }
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
    return null;
}
