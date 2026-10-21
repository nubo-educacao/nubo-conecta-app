// Contrato de dataLayer — TP-7 7A task 4; regras R1–R5 de NUB-RD-85.
//
// O app NUNCA chama `fbq` direto. Ele empurra para o dataLayer e o GTM traduz.
// É o que permite trocar de ferramenta, ou adicionar uma segunda, sem mexer no
// app — que é a razão inteira de ter escolhido o GTM.
//
// Dois portões, nos dois lados do dataLayer:
//   · o container só é carregado após opt-in (loadTagManager, chamado pelo
//     ConsentProvider);
//   · eventos de conversão só entram no dataLayer com consentimento de
//     publicidade VIGENTE no momento do evento. Sem isso, um push feito antes
//     do opt-in seria processado pelo container ao subir depois — um replay
//     retroativo de conversão pré-consentimento, que não tem contrato aprovado.

import {
    captureAdvertisingAuthorization,
    isAdvertisingAuthorizationCurrent,
    type AdvertisingAuthorization,
} from '@/lib/consent';
import { claimConversionEvent, type ConversionKind } from '@/services/conversionEventService';

export { captureAdvertisingAuthorization, type AdvertisingAuthorization };

export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

const GTM_SCRIPT_ID = 'nubo-gtm';

declare global {
    interface Window {
        dataLayer?: Array<Record<string, unknown>>;
    }
}

function push(payload: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
}


/**
 * Sobe o container GTM uma única vez por página.
 *
 * Quem chama (ConsentProvider) garante a ordem: `consent default` (no <head>)
 * → `consent update` com a escolha → só então este carregamento.
 *
 * Não existe o inverso. Um container que já executou não é desfeito removendo
 * a tag <script>: na revogação o efeito na página corrente vem do Consent Mode
 * (update denied) e do corte dos pushes acima; na próxima carga completa o
 * container simplesmente não sobe.
 */
export function loadTagManager(containerId: string = GTM_CONTAINER_ID): boolean {
    if (typeof document === 'undefined' || !containerId) return false;
    if (document.getElementById(GTM_SCRIPT_ID)) return false;

    push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.id = GTM_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    const first = document.getElementsByTagName('script')[0];
    if (first?.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
    return true;
}

async function trackClaimed(
    kind: ConversionKind,
    event: string,
    authorization: AdvertisingAuthorization | null,
) {
    // Reivindica SEMPRE, com ou sem consentimento: o evento lógico é consumido
    // no momento em que acontece. Quem recusou e aceita depois não recebe o
    // cadastro antigo "atrasado" num login futuro.
    const claim = await claimConversionEvent(kind);
    if (!claim?.shouldEmit) return;
    // A autorização é a do INSTANTE do evento, conferida de novo agora: se a
    // pessoa decidiu qualquer coisa enquanto a rede respondia (aceitou depois
    // de ter recusado, revogou, revogou e aceitou de novo), o evento não sai.
    if (!isAdvertisingAuthorizationCurrent(authorization)) return;
    push({ event, event_id: claim.eventId });
}

/**
 * Cadastro efetivo (Lead). Chamado a cada SIGNED_IN; o servidor diz se este é
 * o primeiro cadastro confirmado da conta — login de conta existente, outra
 * aba, recarga e recuperação de sessão recebem "não".
 *
 * `authorization` deve ser capturada no instante do SIGNED_IN; sem argumento,
 * vale o instante desta chamada.
 */
export function trackLead(
    authorization: AdvertisingAuthorization | null = captureAdvertisingAuthorization(),
): Promise<void> {
    return trackClaimed('lead', 'nubo_lead', authorization);
}

/**
 * Onboarding completo — o evento mais valioso e o mais esquecido.
 *
 * 52% dos cadastros nunca completam o onboarding. Sem separar este do `Lead`,
 * a Meta otimiza por cadastro raso. Chamar só DEPOIS de persistir
 * `onboarding_completed` (o instante do evento): o servidor confere a
 * persistência e concede uma vez por conta.
 */
export function trackCompleteRegistration(
    authorization: AdvertisingAuthorization | null = captureAdvertisingAuthorization(),
): Promise<void> {
    return trackClaimed('complete_registration', 'nubo_complete_registration', authorization);
}

// ─── ViewContent = uma abertura real do detalhe (decisão humana 15/10/2026) ──
//
// Cada abertura tem seu próprio event_id opaco (aleatório, sem relação com a
// pessoa). Retries e efeitos/renderizações duplicados da MESMA abertura usam
// o mesmo objeto — mesmo id, uma emissão. Revisita, recarga ou outra
// navegação é outra abertura, com outro id. Nada é guardado no navegador.
//
// A autorização de publicidade é a do instante da abertura: uma abertura feita
// sem consentimento nunca é emitida, mesmo que a pessoa aceite em seguida.

export interface ViewContentOpening {
    readonly eventId: string;
    readonly unifiedOpportunityId: string;
    readonly authorization: AdvertisingAuthorization | null;
    emitted: boolean;
}

/** Registra uma nova abertura do detalhe (chamar uma vez por abertura). */
export function openViewContent(unifiedOpportunityId: string): ViewContentOpening {
    return {
        eventId: globalThis.crypto.randomUUID(),
        unifiedOpportunityId,
        authorization: captureAdvertisingAuthorization(),
        emitted: false,
    };
}

/**
 * Emite o ViewContent da abertura, no máximo uma vez. Chamar de novo para a
 * mesma abertura (efeito repetido, retry) não gera segundo evento.
 */
export function trackViewContent(opening: ViewContentOpening): boolean {
    if (typeof window === 'undefined' || opening.emitted) return false;
    if (!isAdvertisingAuthorizationCurrent(opening.authorization)) return false;
    opening.emitted = true;
    push({
        event: 'nubo_view_content',
        event_id: opening.eventId,
        content_id: opening.unifiedOpportunityId,
    });
    return true;
}

// ⚠️ PII
// Nada aqui envia e-mail, telefone, nome, CPF ou o id da pessoa. O que a Meta
// aceita para matching é hash SHA-256 — e mesmo isso depende da base legal em
// consulta com o encarregado. Enquanto não houver resposta, não adicionar
// campo de identificação a estes eventos, nem mesmo com hash.
