// @vitest-environment jsdom
//
// NUB-RD-85 (TP-7) — guardas do mecanismo de consentimento e dos eventos que
// JÁ estão corretos em main. São regressão, não aceite: nenhum destes testes
// prova que o container GTM respeita a escolha nem que a Meta recebeu algo.
//
// Os desvios encontrados na auditoria (Lead em login existente, GTM antes do
// opt-in, UUID no event_id, CompleteRegistration ao refazer match) ficam em
// tests/reproducers/nub_rd_85_gtm_consent.test.tsx, que FALHA de propósito
// até haver decisão humana e correção autorizada.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

// ─── Supabase controlável ────────────────────────────────────────────────────
// O harness emite eventos de auth à mão. Nenhuma requisição sai do processo.
type AuthCallback = (event: string, session: unknown) => void;
const auth = vi.hoisted(() => ({ callbacks: [] as AuthCallback[] }));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
            onAuthStateChange: vi.fn((cb: AuthCallback) => {
                auth.callbacks.push(cb);
                return { data: { subscription: { unsubscribe: vi.fn() } } };
            }),
            signOut: vi.fn(),
        },
    },
}));

vi.mock('@/services/attributionService', () => ({
    attachAttribution: vi.fn(() => Promise.resolve()),
}));

import { AuthProvider } from '@/contexts/AuthContext';
import { ConsentProvider, useConsent } from '@/components/consent/ConsentProvider';
import ConsentBanner from '@/components/consent/ConsentBanner';
import {
    CONSENT_COOKIE,
    CONSENT_POLICY_VERSION,
    GRANTED,
    parseConsent,
    serializeConsent,
} from '@/lib/consent';
import { trackViewContent } from '@/lib/analytics';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function session(id = USER_ID) {
    return { user: { id, created_at: new Date().toISOString() } };
}

function emit(event: string, s: unknown) {
    act(() => {
        for (const cb of auth.callbacks) cb(event, s);
    });
}

async function renderAuth() {
    // getSession resolve numa microtask; aguardar evita update fora de act.
    await act(async () => {
        render(<AuthProvider><div /></AuthProvider>);
    });
}

function dataLayerEvents(name: string) {
    return (window.dataLayer ?? []).filter(
        (e) => (e as Record<string, unknown>).event === name,
    ) as Array<Record<string, unknown>>;
}

function clearCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
}

function readConsentCookie() {
    const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
        ?.slice(CONSENT_COOKIE.length + 1);
    return parseConsent(raw);
}

let gtag: ReturnType<typeof vi.fn>;

beforeEach(() => {
    auth.callbacks.length = 0;
    window.dataLayer = [];
    gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    clearCookie(CONSENT_COOKIE);
});

afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
});

// ─── Consentimento ───────────────────────────────────────────────────────────

function RevokeLink() {
    // Mesmo gatilho do Footer ("Preferências de cookies").
    const { reopen } = useConsent();
    return <button onClick={reopen}>Preferências de cookies</button>;
}

function renderConsent() {
    return render(
        <ConsentProvider>
            <RevokeLink />
            <ConsentBanner />
        </ConsentProvider>,
    );
}

function lastConsentUpdate() {
    const calls = gtag.mock.calls.filter((c) => c[0] === 'consent' && c[1] === 'update');
    return calls.at(-1)?.[2] as Record<string, string> | undefined;
}

describe('consentimento ausente', () => {
    it('abre o banner e não publica nenhum update de consentimento', () => {
        renderConsent();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(lastConsentUpdate()).toBeUndefined();
    });

    it('oferece Aceitar e Recusar, sem botão de fechar antes da decisão', () => {
        renderConsent();
        expect(screen.getByRole('button', { name: 'Aceitar todos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
    });
});

describe('consentimento aceito / recusado / por categoria', () => {
    it('aceitar grava cookie com versão e data e concede os sinais do Google', () => {
        renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }));

        const rec = readConsentCookie();
        expect(rec?.state).toEqual(GRANTED);
        expect(rec?.policyVersion).toBe(CONSENT_POLICY_VERSION);
        expect(Number.isNaN(Date.parse(rec?.decidedAt ?? ''))).toBe(false);
        expect(lastConsentUpdate()).toMatchObject({
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
        });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('recusar grava a recusa e mantém publicidade e analytics negados', () => {
        renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

        expect(readConsentCookie()?.state).toMatchObject({ analytics: false, advertising: false });
        expect(lastConsentUpdate()).toMatchObject({
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
        });
    });

    it('escolher só análise de uso não concede publicidade', () => {
        renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Escolher' }));
        fireEvent.click(screen.getByLabelText(/Análise de uso/));
        fireEvent.click(screen.getByRole('button', { name: 'Salvar escolha' }));

        expect(lastConsentUpdate()).toMatchObject({
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
        });
    });
});

describe('escolha registrada, alterada, revogada, expirada e nova versão', () => {
    it('republica a escolha salva no carregamento, sem reabrir o banner', () => {
        document.cookie = `${CONSENT_COOKIE}=${serializeConsent({
            state: GRANTED,
            policyVersion: CONSENT_POLICY_VERSION,
            decidedAt: '2026-10-01T10:00:00.000Z',
        })}; path=/`;

        renderConsent();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(lastConsentUpdate()).toMatchObject({ ad_storage: 'granted' });
    });

    it('revogar pelo link do rodapé volta todos os sinais para denied', () => {
        renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }));
        expect(lastConsentUpdate()).toMatchObject({ ad_storage: 'granted' });

        fireEvent.click(screen.getByRole('button', { name: 'Preferências de cookies' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

        expect(readConsentCookie()?.state.advertising).toBe(false);
        expect(lastConsentUpdate()).toMatchObject({
            ad_storage: 'denied',
            analytics_storage: 'denied',
        });
    });

    it('fechar o painel reaberto preserva a escolha anterior', () => {
        renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }));
        const before = gtag.mock.calls.length;

        fireEvent.click(screen.getByRole('button', { name: 'Preferências de cookies' }));
        fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

        expect(readConsentCookie()?.state).toEqual(GRANTED);
        expect(gtag.mock.calls.length).toBe(before);
    });

    it('cookie expirado (removido pelo navegador) equivale a ausente: banner reabre negado', () => {
        // A expiração é o max-age do cookie; não há checagem de decidedAt.
        renderConsent();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(lastConsentUpdate()).toBeUndefined();
    });

    it('consentimento de versão anterior do texto não é herdado', () => {
        document.cookie = `${CONSENT_COOKIE}=${serializeConsent({
            state: GRANTED,
            policyVersion: '2000-01-1',
            decidedAt: '2026-01-01T10:00:00.000Z',
        })}; path=/`;

        renderConsent();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(lastConsentUpdate()).toBeUndefined();
    });
});

// ─── Lead: o que já está certo ───────────────────────────────────────────────

describe('Lead — eventos de auth que NÃO são entrada nova', () => {
    it.each(['INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED'])(
        '%s não dispara nubo_lead',
        async (event) => {
            await renderAuth();
            emit(event, session());
            expect(dataLayerEvents('nubo_lead')).toHaveLength(0);
        },
    );

    it('SIGNED_IN repetido na mesma página dispara no máximo uma vez', async () => {
        await renderAuth();
        emit('SIGNED_IN', session());
        emit('SIGNED_IN', session());
        expect(dataLayerEvents('nubo_lead')).toHaveLength(1);
    });

    it('o payload do Lead não leva e-mail, telefone nem nome', async () => {
        await renderAuth();
        emit('SIGNED_IN', {
            user: {
                id: USER_ID,
                email: 'pessoa@example.com',
                phone: '+5511999999999',
                user_metadata: { full_name: 'Pessoa Teste' },
            },
        });
        const payload = JSON.stringify(dataLayerEvents('nubo_lead'));
        expect(payload).not.toContain('pessoa@example.com');
        expect(payload).not.toContain('5511999999999');
        expect(payload).not.toContain('Pessoa Teste');
    });
});

describe('ViewContent — payload', () => {
    it('content_id é o unified_opportunity_id e o event_id é estável', () => {
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: 'anon-1' });
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: 'anon-1' });
        const [a, b] = dataLayerEvents('nubo_view_content');
        expect(a.content_id).toBe('mec_123');
        expect(a.event_id).toBe(b.event_id);
    });
});
