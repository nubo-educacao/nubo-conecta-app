// Contrato de dataLayer — TP-7 7A task 4.
//
// O app NUNCA chama `fbq` direto. Ele empurra para o dataLayer e o GTM traduz.
// É o que permite trocar de ferramenta, ou adicionar uma segunda, sem mexer no
// app — que é a razão inteira de ter escolhido o GTM.
//
// Hoje o pixel está hardcoded em layout.tsx e dispara SÓ PageView. Nenhum
// `fbq('track','Lead')` existe no código: a Meta nunca soube que um cadastro do
// Nubo aconteceu, e a mídia paga vem otimizando por tráfego.

export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

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
 * `event_id` DETERMINÍSTICO — não é detalhe.
 *
 * Precisa ser o mesmo no navegador e no servidor. Quando o CAPI entrar, é ele
 * que impede a Meta contar cada cadastro DUAS vezes: uma pelo pixel, outra pelo
 * servidor.
 *
 * Por isso é derivado do id do usuário e não de timestamp nem de random — os
 * dois lados precisam chegar ao mesmo valor sem se falarem.
 */
export function eventId(kind: string, subjectId: string): string {
    return `${kind}:${subjectId}`;
}

/** Cadastro concluído. */
export function trackLead(userId: string) {
    push({
        event: 'nubo_lead',
        event_id: eventId('lead', userId),
    });
}

/**
 * Onboarding completo — o evento mais valioso e o mais esquecido.
 *
 * 52% dos cadastros nunca completam o onboarding. Sem separar este do `Lead`,
 * a Meta otimiza por cadastro raso: traz volume de gente que abre a conta e
 * some.
 */
export function trackCompleteRegistration(userId: string) {
    push({
        event: 'nubo_complete_registration',
        event_id: eventId('complete_registration', userId),
    });
}

/** Detalhe de oportunidade. */
export function trackViewContent(opts: { unifiedOpportunityId: string; subjectId: string }) {
    push({
        event: 'nubo_view_content',
        event_id: eventId(`view_content:${opts.unifiedOpportunityId}`, opts.subjectId),
        content_id: opts.unifiedOpportunityId,
    });
}

// ⚠️ PII
// Nada aqui envia e-mail, telefone, nome ou CPF. O que a Meta aceita para
// matching é hash SHA-256 — e mesmo isso depende da base legal em consulta com
// o encarregado. Enquanto não houver resposta, não adicionar campo de
// identificação a estes eventos, nem mesmo com hash.
