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
