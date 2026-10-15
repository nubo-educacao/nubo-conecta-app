// @vitest-environment jsdom
//
// NUB-RD-85 (TP-7 rev. 2) — contratos R1–R5 aprovados pelo humano em 12/10/2026.
// Substituem os reproducers RED de tests/reproducers/nub_rd_85_gtm_consent.test.tsx
// (auditoria 67b5deb8) e fazem parte da suíte normal.
//
// Sem mock de auth: os clientes são os REAIS do app (@supabase/ssr + auth-js),
// duas instâncias compartilhando o mesmo document.cookie fazem o papel de duas
// abas, e o auth-js retransmite SIGNED_IN entre elas por BroadcastChannel como
// no navegador. O servidor é tests/helpers/fakeSupabaseBackend.ts (memória,
// mesma semântica da RPC claim_conversion_event, testada em SQL no admin).
// Nenhuma requisição sai do processo; o gtm.js nunca é baixado (jsdom não
// carrega <script src>).
//
// O que NÃO prova: container GTM real, consent checks das tags, recebimento
// em Meta/Google. Isso é a task 85d.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    createFakeSupabaseBackend,
    FAKE_ANON_KEY,
    FAKE_SUPABASE_URL,
    type FakeSupabaseBackend,
} from '../../helpers/fakeSupabaseBackend';

const holder = vi.hoisted(() => {
    // GTM_CONTAINER_ID é lido no carregamento do módulo.
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TESTE00';
    return { current: null as unknown as Record<string, unknown> };
});

// O app importa um singleton; aqui ele aponta para a "aba" ativa.
vi.mock('@/lib/supabase', () => ({
    supabase: new Proxy(
        {},
        {
            get(_t, prop) {
                const client = holder.current as Record<string | symbol, unknown>;
                const value = client[prop];
                return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
            },
        },
    ),
}));
vi.mock('@/services/attributionService', () => ({
    attachAttribution: vi.fn(() => Promise.resolve({ ok: true, attributed: false })),
}));

// Formulário real; só os writes que não definem "onboarding completo" e o match
// (outro serviço) são substituídos. markOnboardingComplete e getUser são reais.
const ONBOARDING_DATA = vi.hoisted(() => ({
    profile: {
        full_name: 'Pessoa Teste Silva',
        birth_date: '2007-05-10',
        education: 'Ensino Médio Completo',
        school_type: 'Escola pública',
        zip_code: '01001000',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Sé',
        street: 'Praça da Sé',
        street_number: '100',
    },
    income: { family_count: 3, per_capita_income: 1000, member_incomes: [3000], social_benefits: 0, alimony: 0 },
    preferences: { program_preference: 'sisu', university_preference: 'publica' },
    enemScores: [
        { year: 2025, nota_linguagens: 600, nota_ciencias_humanas: 610, nota_ciencias_natureza: 590, nota_matematica: 620, nota_redacao: 700, is_treineiro: false },
    ],
}));
vi.mock('@/services/profileService', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@/services/profileService')>();
    return {
        ...mod,
        saveUserData: vi.fn(() => Promise.resolve()),
        saveUserIncome: vi.fn(() => Promise.resolve()),
        saveUserPreferences: vi.fn(() => Promise.resolve()),
        saveUserEnemScore: vi.fn(() => Promise.resolve()),
        getUserOnboardingData: vi.fn(() => Promise.resolve(ONBOARDING_DATA)),
    };
});
vi.mock('@/services/matchService', () => ({
    generateMatchAsync: vi.fn(() => Promise.resolve({ jobId: 'job-1' })),
    generateMatch: vi.fn(() => Promise.resolve()),
    getMatchStatus: vi.fn(() => Promise.resolve('ready')),
}));
vi.mock('@/lib/availableCategories', () => ({ fetchAvailableCategories: vi.fn(() => Promise.resolve([])) }));

// RootLayout: só o <head> interessa.
vi.mock('next/font/google', () => ({ Montserrat: () => ({ className: 'font' }) }));
vi.mock('next/script', () => ({
    default: ({ id, children }: { id: string; children?: React.ReactNode }) =>
        React.createElement('script', { 'data-script-id': id }, children),
}));
const { Pass, Nothing } = vi.hoisted(() => ({
    Pass: ({ children }: { children?: unknown }) => children ?? null,
    Nothing: () => null,
}));
vi.mock('@/contexts/ProfileContext', () => ({ ProfileProvider: Pass }));
vi.mock('@/contexts/FavoritesContext', () => ({ FavoritesProvider: Pass }));
vi.mock('@/components/CloudBackground', () => ({ default: Nothing }));
vi.mock('@/components/chat/ChatFAB', () => ({ default: Nothing }));
vi.mock('@/components/auth/GlobalAuthModal', () => ({ default: Nothing }));
vi.mock('@/components/layout/Footer', () => ({ default: Nothing }));

import { AuthProvider } from '@/contexts/AuthContext';
import { ConsentProvider, useConsent } from '@/components/consent/ConsentProvider';
import ConsentBanner from '@/components/consent/ConsentBanner';
import MatchOnboardingForm from '@/components/match/MatchOnboardingForm';
import { trackViewContent } from '@/lib/analytics';
import { CONSENT_COOKIE, CONSENT_POLICY_VERSION, DENIED, GRANTED, serializeConsent, type ConsentState } from '@/lib/consent';
import RootLayout from '@/app/layout';

const GTM_SRC = 'googletagmanager.com/gtm.js';

// ─── Infra ───────────────────────────────────────────────────────────────────

let backend: FakeSupabaseBackend;
const clients: SupabaseClient[] = [];

function newTabClient(): SupabaseClient {
    const client = createBrowserClient(FAKE_SUPABASE_URL, FAKE_ANON_KEY, {
        isSingleton: false,
        global: { fetch: backend.fetch },
    }) as unknown as SupabaseClient;
    clients.push(client);
    return client;
}

async function openTab() {
    const client = newTabClient();
    holder.current = client as unknown as Record<string, unknown>;
    let unmount = () => {};
    await act(async () => {
        unmount = render(
            <AuthProvider>
                <div />
            </AuthProvider>,
        ).unmount;
    });
    return { client, unmount };
}

async function settle(ms = 40) {
    await act(async () => {
        await new Promise((r) => setTimeout(r, ms));
    });
}

async function signUpOrLogin(client: SupabaseClient, phone: string) {
    holder.current = client as unknown as Record<string, unknown>;
    await act(async () => {
        await client.auth.signInWithOtp({ phone });
        const { error } = await client.auth.verifyOtp({ phone, token: '123456', type: 'sms' });
        if (error) throw error;
    });
}

function events(name: string) {
    return (window.dataLayer ?? []).filter((e) => (e as Record<string, unknown>)?.event === name) as Array<
        Record<string, unknown>
    >;
}

function setConsentCookie(state: ConsentState, version = CONSENT_POLICY_VERSION) {
    document.cookie = `${CONSENT_COOKIE}=${serializeConsent({
        state,
        policyVersion: version,
        decidedAt: '2026-10-15T10:00:00.000Z',
    })}; path=/`;
}

function clearAllCookies() {
    for (const c of document.cookie.split('; ')) {
        const name = c.split('=')[0];
        if (name) document.cookie = `${name}=; path=/; max-age=0`;
    }
}

function gtmScripts() {
    return Array.from(document.querySelectorAll('script')).filter((s) => s.src.includes(GTM_SRC));
}

beforeEach(() => {
    backend = createFakeSupabaseBackend();
    window.dataLayer = [];
    // Mesmo gtag do snippet consent-default do layout.
    (window as unknown as { gtag: unknown }).gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
    };
    clearAllCookies();
    window.localStorage.clear();
    for (const s of gtmScripts()) s.remove();
    setConsentCookie(GRANTED);
});

afterEach(async () => {
    cleanup();
    for (const c of clients.splice(0)) {
        await c.auth.stopAutoRefresh();
        (c.auth as unknown as { broadcastChannel?: BroadcastChannel }).broadcastChannel?.close();
    }
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(backend.unexpected).toEqual([]);
});

// ─── R1 — Lead = primeiro cadastro efetivo confirmado ────────────────────────

describe('R1 — Lead somente no primeiro cadastro efetivo confirmado', () => {
    it('cadastro novo (OTP → verifyOtp) emite exatamente um nubo_lead com o event_id do servidor', async () => {
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000001');
        await waitFor(() => expect(backend.claimCalls).toHaveLength(1));
        await settle();

        const user = [...backend.users.values()][0];
        expect(events('nubo_lead')).toHaveLength(1);
        expect(events('nubo_lead')[0].event_id).toBe(backend.claims.get(`${user.id}:lead`)!.eventId);
    });

    it('login de conta existente (criada antes do corte) NÃO emite Lead, mesmo recebendo SIGNED_IN', async () => {
        backend.addUser({ id: '00000000-0000-4000-8000-00000000a002', phone: '+5511900000002', createdAfterCutover: false, confirmed: true });
        const tab = await openTab();
        const seen: string[] = [];
        tab.client.auth.onAuthStateChange((e) => {
            seen.push(e);
        });

        await signUpOrLogin(tab.client, '+5511900000002');
        await waitFor(() => expect(backend.claimCalls).toHaveLength(1));
        await settle();

        expect(seen).toContain('SIGNED_IN');
        expect(events('nubo_lead')).toHaveLength(0);
    });

    it('nova sessão da mesma conta em outro dia (logout → login) não gera segundo Lead', async () => {
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000003');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));
        await act(async () => {
            await tab.client.auth.signOut();
        });
        tab.unmount();

        const later = await openTab();
        await signUpOrLogin(later.client, '+5511900000003');
        await waitFor(() => expect(backend.claimCalls).toHaveLength(2));
        await settle();

        expect(events('nubo_lead')).toHaveLength(1);
    });
});

// ─── R2 — ciclo de sessão realista: abas, recarga, foco ──────────────────────

describe('R2 — Lead não se repete por aba, recarga ou foco', () => {
    it('a outra aba recebe SIGNED_IN pelo BroadcastChannel do auth-js e não emite segundo Lead', async () => {
        const tab1 = await openTab();
        const tab2 = await openTab();
        const tab2Events: string[] = [];
        tab2.client.auth.onAuthStateChange((e) => {
            tab2Events.push(e);
        });

        await signUpOrLogin(tab1.client, '+5511900000010');
        await waitFor(() => expect(tab2Events).toContain('SIGNED_IN'));
        await waitFor(() => expect(backend.claimCalls).toHaveLength(2));
        await settle();

        // As duas abas pediram; o servidor deixou emitir uma vez só.
        const [a, b] = backend.claimCalls;
        expect(a.requestId).not.toBe(b.requestId);
        expect(backend.claimCalls.filter((c) => c.result[0]?.should_emit)).toHaveLength(1);
        expect(events('nubo_lead')).toHaveLength(1);
    });

    it('recarregar a página: o auth-js recupera a sessão do cookie e EMITE SIGNED_IN de novo, e mesmo assim não há segundo Lead', async () => {
        // Achado desta rodada: auth-js 2.101 (_recoverAndRefresh) notifica
        // SIGNED_IN ao recuperar a sessão salva numa página nova. Por isso
        // SIGNED_IN não pode ser prova de cadastro.
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000011');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));
        tab.unmount();

        const reloadedClient = newTabClient();
        const seen: string[] = [];
        reloadedClient.auth.onAuthStateChange((e) => {
            seen.push(e);
        });
        holder.current = reloadedClient as unknown as Record<string, unknown>;
        await act(async () => {
            render(
                <AuthProvider>
                    <div />
                </AuthProvider>,
            );
        });
        await settle(80);

        expect(seen).toContain('SIGNED_IN');
        expect(seen).toContain('INITIAL_SESSION');
        // Quem perguntou depois da recarga ouviu "já reivindicado".
        expect(backend.claimCalls.slice(1).every((c) => c.result[0]?.should_emit === false)).toBe(true);
        expect(events('nubo_lead')).toHaveLength(1);
    });

    it('logout e cadastro de OUTRA conta na mesma página: o segundo cadastro também conta (uma vez)', async () => {
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000013');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));
        await act(async () => {
            await tab.client.auth.signOut();
        });
        await signUpOrLogin(tab.client, '+5511900000014');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(2));
        await settle(80);

        expect(events('nubo_lead')).toHaveLength(2);
        expect(events('nubo_lead')[0].event_id).not.toBe(events('nubo_lead')[1].event_id);
    });

    it('voltar o foco para a aba (visibilitychange) não gera Lead', async () => {
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000012');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));

        await act(async () => {
            Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await settle(80);

        expect(events('nubo_lead')).toHaveLength(1);
    });
});

// ─── R3 — CompleteRegistration = primeira conclusão PERSISTIDA ────────────────

async function submitOnboarding(userId: string) {
    const onComplete = vi.fn();
    const view = render(<MatchOnboardingForm userId={userId} onComplete={onComplete} />);
    await screen.findByDisplayValue('Pessoa Teste Silva');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    await screen.findByRole('button', { name: /Continuar/ });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    const finish = await screen.findByRole('button', { name: /Finalizar e Ver Matches/ });
    await act(async () => {
        fireEvent.click(finish);
    });
    return { onComplete, view };
}

async function signedInNewUser(phone: string) {
    const tab = await openTab();
    await signUpOrLogin(tab.client, phone);
    await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));
    const user = [...backend.users.values()].find((u) => u.phone === phone)!;
    return { tab, user };
}

describe('R3 — CompleteRegistration só na primeira conclusão persistida do onboarding', () => {
    it('submit real do formulário: persiste onboarding_completed e emite um CompleteRegistration com event_id do servidor', async () => {
        const { user } = await signedInNewUser('+5511900000020');
        const { onComplete } = await submitOnboarding(user.id);

        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(events('nubo_complete_registration')).toHaveLength(1));
        expect(user.metadata.onboarding_completed).toBe(true);
        expect(events('nubo_complete_registration')[0].event_id).toBe(
            backend.claims.get(`${user.id}:complete_registration`)!.eventId,
        );
    });

    it('"Refazer Match" (mesmo formulário, onboarding já concluído) não emite de novo', async () => {
        const { user } = await signedInNewUser('+5511900000021');
        const first = await submitOnboarding(user.id);
        await waitFor(() => expect(events('nubo_complete_registration')).toHaveLength(1));
        first.view.unmount();

        const redo = await submitOnboarding(user.id);
        await waitFor(() => expect(redo.onComplete).toHaveBeenCalledTimes(1));
        await settle(80);

        expect(events('nubo_complete_registration')).toHaveLength(1);
    });

    it('conta que concluiu o onboarding ANTES do deploy e refaz o match não emite', async () => {
        backend.addUser({
            id: '00000000-0000-4000-8000-00000000a022',
            phone: '+5511900000022',
            createdAfterCutover: false,
            confirmed: true,
            metadata: { onboarding_completed: true },
        });
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000022');
        const { onComplete } = await submitOnboarding('00000000-0000-4000-8000-00000000a022');
        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
        await settle(80);

        expect(events('nubo_complete_registration')).toHaveLength(0);
    });

    it('falha ao persistir não emite sucesso; a nova tentativa que persiste emite uma vez', async () => {
        const { user } = await signedInNewUser('+5511900000023');
        backend.failNextUpdateUser();
        const { onComplete } = await submitOnboarding(user.id);

        await screen.findByText(/markOnboardingComplete/);
        await settle(80);
        expect(onComplete).not.toHaveBeenCalled();
        expect(user.metadata.onboarding_completed).toBeUndefined();
        expect(events('nubo_complete_registration')).toHaveLength(0);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Finalizar e Ver Matches/ }));
        });
        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(events('nubo_complete_registration')).toHaveLength(1));
    });
});

// ─── R4 — event_id opaco, estável em retry, isolado ──────────────────────────

describe('R4 — event_id opaco por evento lógico', () => {
    it('Lead e CompleteRegistration não levam o UUID da pessoa nem PII no payload', async () => {
        const { user } = await signedInNewUser('+5511900000030');
        await submitOnboarding(user.id);
        await waitFor(() => expect(events('nubo_complete_registration')).toHaveLength(1));

        const payload = JSON.stringify([...events('nubo_lead'), ...events('nubo_complete_registration')]);
        expect(payload).not.toContain(user.id);
        expect(payload).not.toContain('5511900000030');
        expect(payload).not.toContain('Pessoa Teste');
        expect(Object.keys(events('nubo_lead')[0]).sort()).toEqual(['event', 'event_id']);
    });

    it('retry: resposta perdida depois do commit → mesmo pedido repetido, emitido uma vez com o mesmo event_id', async () => {
        backend.dropNextClaimResponses(1);
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000031');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(1));
        await settle();

        expect(backend.claimCalls).toHaveLength(2);
        expect(backend.claimCalls[0].requestId).toBe(backend.claimCalls[1].requestId);
        expect(events('nubo_lead')[0].event_id).toBe(backend.claimCalls[0].result[0].event_id);
    });

    it('isolamento: pessoas diferentes e eventos diferentes têm event_ids diferentes', async () => {
        const a = await signedInNewUser('+5511900000032');
        await submitOnboarding(a.user.id);
        await waitFor(() => expect(events('nubo_complete_registration')).toHaveLength(1));
        cleanup();
        clearAllCookies();
        setConsentCookie(GRANTED);

        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000033');
        await waitFor(() => expect(events('nubo_lead')).toHaveLength(2));

        const ids = [...events('nubo_lead'), ...events('nubo_complete_registration')].map((e) => e.event_id);
        expect(new Set(ids).size).toBe(3);
    });

    it('ViewContent: content_id preservado, sem UUID da pessoa, mesmo event_id na revisita, isolado por oportunidade e pessoa', () => {
        const USER = '00000000-0000-4000-8000-00000000c001';
        const OTHER = '00000000-0000-4000-8000-00000000c002';
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: USER });
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: USER }); // revisita
        trackViewContent({ unifiedOpportunityId: 'partner_9', subjectId: USER });
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: OTHER }); // outra pessoa, mesmo navegador

        const [first, revisit, otherOpp, otherPerson] = events('nubo_view_content');
        expect(first.content_id).toBe('mec_123');
        expect(otherOpp.content_id).toBe('partner_9');
        expect(revisit.event_id).toBe(first.event_id);
        expect(otherOpp.event_id).not.toBe(first.event_id);
        expect(otherPerson.event_id).not.toBe(first.event_id);
        const payload = JSON.stringify(events('nubo_view_content'));
        expect(payload).not.toContain(USER);
        expect(payload).not.toContain(OTHER);
        expect(String(first.event_id)).not.toContain('mec_123');
    });
});

// ─── Consentimento × eventos (sem replay retroativo) ─────────────────────────

describe('eventos de conversão respeitam o consentimento de publicidade vigente', () => {
    it('sem consentimento: o cadastro é reivindicado (consumido), nada vai ao dataLayer, e aceitar depois não reenvia', async () => {
        clearAllCookies();
        setConsentCookie(DENIED);
        const tab = await openTab();
        await signUpOrLogin(tab.client, '+5511900000040');
        await waitFor(() => expect(backend.claimCalls).toHaveLength(1));
        await settle();
        expect(events('nubo_lead')).toHaveLength(0);
        tab.unmount();

        // Aceita depois, numa nova página, e faz login de novo.
        setConsentCookie(GRANTED);
        await act(async () => {
            render(
                <ConsentProvider>
                    <span />
                </ConsentProvider>,
            );
        });
        const again = await openTab();
        await act(async () => {
            await again.client.auth.signOut();
        });
        await signUpOrLogin(again.client, '+5511900000040');
        // A recuperação de sessão na montagem também pode pedir (SIGNED_IN);
        // quantas vezes depende do agendamento. O contrato é: o login novo foi
        // avaliado pelo servidor e nenhum Lead saiu.
        await waitFor(() =>
            expect(backend.claimCalls.filter((c) => c.result.length > 0).length).toBeGreaterThanOrEqual(2),
        );
        await settle(80);

        expect(backend.claimCalls.filter((c) => c.result[0]?.should_emit)).toHaveLength(1);
        expect(events('nubo_lead')).toHaveLength(0);
    });

    it('só análise de uso não autoriza eventos de publicidade (ViewContent) nem grava armazenamento local', () => {
        clearAllCookies();
        setConsentCookie({ essential: true, analytics: true, advertising: false });
        trackViewContent({ unifiedOpportunityId: 'mec_1', subjectId: 'anon-1' });
        expect(events('nubo_view_content')).toHaveLength(0);
        expect(window.localStorage.length).toBe(0);
    });
});

// ─── R5 — GTM só após opt-in ─────────────────────────────────────────────────

function RevokeLink() {
    const { reopen } = useConsent();
    return <button onClick={reopen}>Preferências de cookies</button>;
}

async function renderConsent() {
    await act(async () => {
        render(
            <ConsentProvider>
                <RevokeLink />
                <ConsentBanner />
            </ConsentProvider>,
        );
    });
}

function dataLayerIndex(pred: (e: unknown) => boolean) {
    return (window.dataLayer ?? []).findIndex(pred);
}
const isGtmStart = (e: unknown) => (e as Record<string, unknown>)?.event === 'gtm.js';
const isConsentUpdate = (e: unknown) =>
    !!e && typeof e === 'object' && 'length' in (e as object) && (e as ArrayLike<unknown>)[0] === 'consent' && (e as ArrayLike<unknown>)[1] === 'update';

describe('R5 — o container GTM só carrega após opt-in da categoria aplicável', () => {
    it('o layout não traz mais o snippet do GTM; mantém o consent-default antes de tudo', () => {
        const html = renderToStaticMarkup(React.createElement(RootLayout, null, React.createElement('div')));
        expect(html).toContain('data-script-id="consent-default"');
        expect(html).not.toContain(GTM_SRC);
    });

    it.each([
        ['ausente', () => clearAllCookies()],
        ['recusado', () => setConsentCookie(DENIED)],
        ['versão antiga do texto', () => setConsentCookie(GRANTED, '2000-01-1')],
        ['expirado (cookie descartado pelo navegador)', () => clearAllCookies()],
    ])('%s: nenhum gtm.js no DOM nem no dataLayer', async (_name, arrange) => {
        clearAllCookies();
        arrange();
        await renderConsent();
        await settle();
        expect(gtmScripts()).toHaveLength(0);
        expect(dataLayerIndex(isGtmStart)).toBe(-1);
    });

    it('recusar no banner não carrega', async () => {
        clearAllCookies();
        await renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
        await settle();
        expect(gtmScripts()).toHaveLength(0);
        expect(dataLayerIndex(isGtmStart)).toBe(-1);
    });

    it('aceitar carrega uma única vez, com o update de consentimento ANTES do gtm.js', async () => {
        clearAllCookies();
        await renderConsent();
        fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }));
        await settle();

        expect(gtmScripts()).toHaveLength(1);
        expect(gtmScripts()[0].src).toContain('id=GTM-TESTE00');
        const upd = dataLayerIndex(isConsentUpdate);
        const start = dataLayerIndex(isGtmStart);
        expect(upd).toBeGreaterThan(-1);
        expect(start).toBeGreaterThan(upd);

        // Reabrir e aceitar de novo não injeta outro container.
        fireEvent.click(screen.getByRole('button', { name: 'Preferências de cookies' }));
        fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }));
        await settle();
        expect(gtmScripts()).toHaveLength(1);
    });

    it('só análise de uso: carrega o container (categoria que ele serve), com sinais de publicidade negados', async () => {
        // Decisão de implementação sinalizada ao humano no walkthrough: o
        // container serve analytics e publicidade; com só analytics, ele sobe
        // e as tags de publicidade dependem das consent checks do container.
        clearAllCookies();
        setConsentCookie({ essential: true, analytics: true, advertising: false });
        await renderConsent();
        await settle();
        expect(gtmScripts()).toHaveLength(1);
        const upd = (window.dataLayer ?? []).filter(isConsentUpdate).at(-1) as unknown as ArrayLike<unknown>;
        expect(upd[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied' });
    });

    it('retorno com aceite salvo carrega depois de republicar o consentimento', async () => {
        await renderConsent();
        await settle();
        expect(gtmScripts()).toHaveLength(1);
        expect(dataLayerIndex(isGtmStart)).toBeGreaterThan(dataLayerIndex(isConsentUpdate));
    });

    it('revogar após o carregamento: update denied e nenhum evento de conversão novo; a próxima página não carrega', async () => {
        await renderConsent();
        await settle();
        expect(gtmScripts()).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Preferências de cookies' }));
        fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
        await settle();

        const last = (window.dataLayer ?? []).filter(isConsentUpdate).at(-1) as unknown as ArrayLike<unknown>;
        expect(last[2]).toMatchObject({ ad_storage: 'denied', analytics_storage: 'denied' });
        trackViewContent({ unifiedOpportunityId: 'mec_7', subjectId: 'anon-7' });
        expect(events('nubo_view_content')).toHaveLength(0);

        // O script já executado não é "descarregado" (nem é alegado): o efeito
        // da revogação na página corrente é via Consent Mode + corte dos pushes.
        // Na próxima carga completa o container não sobe.
        cleanup();
        for (const s of gtmScripts()) s.remove();
        window.dataLayer = [];
        await renderConsent();
        await settle();
        expect(gtmScripts()).toHaveLength(0);
        expect(dataLayerIndex(isGtmStart)).toBe(-1);
    });
});
