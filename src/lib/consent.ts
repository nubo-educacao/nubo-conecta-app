// Consentimento de cookies — TP-7 7A task 2.
//
// ⚠️ ESTE ARQUIVO NÃO DECIDE NADA DE JURÍDICO.
//    Categorias, textos, retenção e base legal estão em consulta com o
//    encarregado. O que está aqui é o MECANISMO, que é correto qualquer que
//    seja a resposta: começar negado nunca está errado.
//
//    O que ainda depende da resposta:
//      · a redação de cada categoria (`label` / `description` abaixo)
//      · se a categoria de analytics é consentimento ou legítimo interesse
//        (se for legítimo interesse, ela sai do banner e vira opt-out)
//      · tratamento de menores de 18 — pode exigir condicionar publicidade à
//        idade declarada, o que NÃO está implementado aqui

export type ConsentCategory = 'essential' | 'analytics' | 'advertising';

export interface ConsentState {
    essential: true;
    analytics: boolean;
    advertising: boolean;
}

export interface ConsentRecord {
    state: ConsentState;
    /** Versão do texto aceito. Muda quando a redação muda — força re-pergunta. */
    policyVersion: string;
    decidedAt: string;
}

/**
 * Incrementar SEMPRE que o texto do banner ou as categorias mudarem.
 * Consentimento dado sobre um texto não vale para outro.
 */
export const CONSENT_POLICY_VERSION = '2026-08-1';

export const CONSENT_COOKIE = 'nubo:consent';

/** 6 meses — a escolha é reperguntada depois disso. Sujeito à resposta do jurídico. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

export const DENIED: ConsentState = {
    essential: true,
    analytics: false,
    advertising: false,
};

export const GRANTED: ConsentState = {
    essential: true,
    analytics: true,
    advertising: true,
};

/**
 * Texto exibido no banner. Rascunho — pendente de revisão do encarregado.
 * Mantido como dado e não espalhado em JSX para que a revisão seja um diff
 * legível por quem não lê React.
 */
export const CONSENT_COPY = {
    title: 'Sua privacidade',
    body:
        'Usamos cookies para manter o Nubo funcionando e, com sua autorização, ' +
        'para entender como a plataforma é usada e mostrar conteúdo relevante. ' +
        'Você pode mudar sua escolha quando quiser.',
    acceptAll: 'Aceitar todos',
    rejectAll: 'Recusar',
    customize: 'Escolher',
    save: 'Salvar escolha',
    // O rodape do app aponta para este PDF; /privacidade e outra pagina.
    policyLink: '/politica-de-privacidade.pdf',
    policyLabel: 'Política de Privacidade',
} as const;

export const CONSENT_CATEGORIES: Array<{
    id: ConsentCategory;
    label: string;
    description: string;
    /** Essencial não é desmarcável: sem ela não há produto. */
    locked: boolean;
}> = [
    {
        id: 'essential',
        label: 'Essenciais',
        description:
            'Necessários para você entrar na conta, navegar e para a segurança da plataforma. ' +
            'Sem eles o Nubo não funciona.',
        locked: true,
    },
    {
        id: 'analytics',
        label: 'Análise de uso',
        description:
            'Ajudam a entender quais partes da plataforma são usadas, para melhorá-las.',
        locked: false,
    },
    {
        id: 'advertising',
        label: 'Publicidade',
        description:
            'Permitem medir a eficácia das nossas divulgações e mostrar conteúdo do Nubo ' +
            'em outras plataformas.',
        locked: false,
    },
];

// ─── Serialização ────────────────────────────────────────────────────────────

export function serializeConsent(record: ConsentRecord): string {
    return encodeURIComponent(JSON.stringify(record));
}

export function parseConsent(raw: string | null | undefined): ConsentRecord | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as ConsentRecord;
        if (!parsed?.state || typeof parsed.state.advertising !== 'boolean') return null;

        // Texto novo invalida consentimento antigo: a pessoa concordou com
        // outra coisa. Tratar como "ainda não decidiu" e reperguntar.
        if (parsed.policyVersion !== CONSENT_POLICY_VERSION) return null;

        return parsed;
    } catch {
        return null;
    }
}

/**
 * Escolha VIGENTE no navegador: cookie presente, versão atual do texto. Sem
 * cookie (nunca decidiu ou expirou) ou com versão antiga, devolve null.
 *
 * É a fonte única para quem decide fora do React (eventos de conversão): lida
 * no momento do uso, nunca guardada, para que uma revogação valha na hora.
 */
export function readStoredConsent(): ConsentRecord | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(
        new RegExp('(?:^|; )' + CONSENT_COOKIE.replace(/[:.]/g, '\\$&') + '=([^;]*)'),
    );
    return parseConsent(match ? match[1] : null);
}

/**
 * O container GTM só sobe com opt-in de alguma categoria que ele serve
 * (doc f74d1cd9 §3.4, guard-rail 1; decisão humana de 12/10/2026). Ausência,
 * recusa, expiração e versão antiga chegam aqui como DENIED.
 *
 * Dentro do container, cada tag continua condicionada ao sinal do Consent Mode
 * da sua categoria — é o que mantém as categorias independentes.
 */
export function allowsTagManager(state: ConsentState): boolean {
    return state.analytics || state.advertising;
}

/** Eventos de conversão (Lead, CompleteRegistration, ViewContent) são publicidade. */
export function allowsAdvertising(state: ConsentState): boolean {
    return state.advertising;
}

// ─── Autorização de publicidade por evento (NUB-RD-85, revisão 8e95e1f7 P1) ───
//
// Uma conversão é autorizada pelo consentimento VIGENTE NO INSTANTE em que
// acontece — não pelo que vale quando a resposta da rede chega. A autorização
// é capturada no evento e conferida de novo antes do push; qualquer nova
// decisão no meio (aceitar, revogar, revogar e aceitar de novo, nesta aba ou
// em outra) a invalida. Assim, um evento anterior ao opt-in nunca é emitido
// por causa de um aceite posterior.

/** Muda a cada decisão salva nesta aba. */
let decisionEpoch = 0;

/** Chamado pelo ConsentProvider sempre que a pessoa decide (inclusive revogar). */
export function noteConsentDecision() {
    decisionEpoch += 1;
}

export interface AdvertisingAuthorization {
    readonly epoch: number;
    /** Versão do texto + instante da decisão: muda se outra aba decidir. */
    readonly decision: string;
}

function decisionKey(record: ConsentRecord): string {
    return `${record.policyVersion}|${record.decidedAt}`;
}

/** Autorização de publicidade no instante do evento; null = não autorizado. */
export function captureAdvertisingAuthorization(): AdvertisingAuthorization | null {
    const record = readStoredConsent();
    if (!record || !allowsAdvertising(record.state)) return null;
    return { epoch: decisionEpoch, decision: decisionKey(record) };
}

/** A autorização capturada continua sendo a decisão vigente, sem mudança no meio? */
export function isAdvertisingAuthorizationCurrent(auth: AdvertisingAuthorization | null): boolean {
    if (!auth || auth.epoch !== decisionEpoch) return false;
    const record = readStoredConsent();
    return record !== null && allowsAdvertising(record.state) && decisionKey(record) === auth.decision;
}

/**
 * Traduz o estado para o vocabulário do Consent Mode v2 do Google.
 *
 * `functionality_storage` e `security_storage` ficam sempre concedidos: são
 * sessão e antifraude, sem os quais não há serviço a prestar.
 */
export function toGoogleConsent(state: ConsentState) {
    return {
        ad_storage: state.advertising ? 'granted' : 'denied',
        ad_user_data: state.advertising ? 'granted' : 'denied',
        ad_personalization: state.advertising ? 'granted' : 'denied',
        analytics_storage: state.analytics ? 'granted' : 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
    } as const;
}
