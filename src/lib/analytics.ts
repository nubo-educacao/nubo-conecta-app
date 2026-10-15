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

import { allowsAdvertising, readStoredConsent } from '@/lib/consent';
import { claimConversionEvent, type ConversionKind } from '@/services/conversionEventService';

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

function advertisingAllowedNow(): boolean {
    const record = readStoredConsent();
    return record !== null && allowsAdvertising(record.state);
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

async function trackClaimed(kind: ConversionKind, event: string) {
    // Reivindica SEMPRE, com ou sem consentimento: o evento lógico é consumido
    // no momento em que acontece. Quem recusou e aceita depois não recebe o
    // cadastro antigo "atrasado" num login futuro.
    const claim = await claimConversionEvent(kind);
    if (!claim?.shouldEmit) return;
    if (!advertisingAllowedNow()) return;
    push({ event, event_id: claim.eventId });
}

/**
 * Cadastro efetivo (Lead). Chamado a cada SIGNED_IN; o servidor diz se este é
 * o primeiro cadastro confirmado da conta — login de conta existente, outra
 * aba, recarga e recuperação de sessão recebem "não".
 */
export function trackLead(): Promise<void> {
    return trackClaimed('lead', 'nubo_lead');
}

/**
 * Onboarding completo — o evento mais valioso e o mais esquecido.
 *
 * 52% dos cadastros nunca completam o onboarding. Sem separar este do `Lead`,
 * a Meta otimiza por cadastro raso. Chamar só DEPOIS de persistir
 * `onboarding_completed`: o servidor confere a persistência e concede uma vez
 * por conta.
 */
export function trackCompleteRegistration(): Promise<void> {
    return trackClaimed('complete_registration', 'nubo_complete_registration');
}

// ─── ViewContent ─────────────────────────────────────────────────────────────
//
// Semântica preservada: o mesmo par (pessoa, oportunidade) repete o mesmo
// event_id nas revisitas, para a Meta deduplicar dentro da janela dela.
// O que MUDOU, e é declarado: o id deixou de ser `view_content:<opp>:<uuid da
// pessoa>` e passou a ser aleatório, guardado neste navegador. Revisita em
// OUTRO dispositivo, ou depois de limpar o armazenamento, gera id novo.
//
// O sujeito (user.id ou id anônimo) fica só no armazenamento local, para não
// misturar duas pessoas no mesmo navegador; nunca vai ao dataLayer.

const VIEW_IDS_KEY = 'nubo:vc_ids';
const VIEW_IDS_MAX = 300;

interface ViewIds {
    subject: string;
    ids: Record<string, string>;
}

// Fallback quando o armazenamento não está disponível: estável na página.
const memoryViewIds = new Map<string, string>();

function readViewIds(subject: string): ViewIds {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(VIEW_IDS_KEY) ?? 'null') as ViewIds | null;
        if (parsed && parsed.subject === subject && parsed.ids && typeof parsed.ids === 'object') return parsed;
    } catch {
        /* armazenamento indisponível ou corrompido: recomeça */
    }
    return { subject, ids: {} };
}

function viewContentEventId(subject: string, opportunityId: string): string {
    const memKey = `${subject}\u0000${opportunityId}`;
    const stored = readViewIds(subject);
    const existing = stored.ids[opportunityId] ?? memoryViewIds.get(memKey);
    if (existing) return existing;

    const id = globalThis.crypto.randomUUID();
    memoryViewIds.set(memKey, id);
    stored.ids[opportunityId] = id;
    const keys = Object.keys(stored.ids);
    for (const k of keys.slice(0, Math.max(0, keys.length - VIEW_IDS_MAX))) delete stored.ids[k];
    try {
        window.localStorage.setItem(VIEW_IDS_KEY, JSON.stringify(stored));
    } catch {
        /* sem armazenamento: vale o id em memória */
    }
    return id;
}

/** Apaga os ids de ViewContent deste navegador (revogação de publicidade). */
export function clearAdvertisingStorage() {
    memoryViewIds.clear();
    try {
        window.localStorage.removeItem(VIEW_IDS_KEY);
    } catch {
        /* nada a apagar */
    }
}

/** Detalhe de oportunidade. */
export function trackViewContent(opts: { unifiedOpportunityId: string; subjectId: string }) {
    if (typeof window === 'undefined') return;
    // Sem consentimento de publicidade, nem o id é criado/armazenado.
    if (!advertisingAllowedNow()) return;
    push({
        event: 'nubo_view_content',
        event_id: viewContentEventId(opts.subjectId, opts.unifiedOpportunityId),
        content_id: opts.unifiedOpportunityId,
    });
}

// ⚠️ PII
// Nada aqui envia e-mail, telefone, nome, CPF ou o id da pessoa. O que a Meta
// aceita para matching é hash SHA-256 — e mesmo isso depende da base legal em
// consulta com o encarregado. Enquanto não houver resposta, não adicionar
// campo de identificação a estes eventos, nem mesmo com hash.
