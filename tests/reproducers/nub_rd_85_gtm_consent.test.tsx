// @vitest-environment jsdom
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * REPRODUCER — NUB-RD-85 (TP-7) auditoria GTM / consentimento
 * Execução: 67b5deb8-d1ed-4482-aaf2-91b57f03245d · Card 74bb59e4-583a-4839-8bbf-d7fdbea7b587
 *
 * Cada teste aqui FALHA em main (b8db4e7) de propósito: descreve o contrato do
 * TP-7 rev. 2 / doc f74d1cd9 §3.4 / runbook 174cfdea e mostra o desvio. Não é
 * para "consertar o teste": a correção de produto depende de decisão humana
 * (semântica de Lead, política de identificação, consent gate antes do
 * container) e de autorização posterior.
 *
 * Rodar: npx vitest run --config vitest.reproducers.config.ts tests/reproducers/nub_rd_85_gtm_consent.test.tsx
 *
 * Nada aqui sai da máquina: Supabase é mockado, o snippet do GTM é renderizado
 * como markup estático e nunca executado.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { act, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

type AuthCallback = (event: string, session: unknown) => void;
const auth = vi.hoisted(() => {
    // GTM_CONTAINER_ID é lido no carregamento do módulo; precisa existir antes.
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TESTE00';
    return { callbacks: [] as AuthCallback[] };
});

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

// RootLayout: só o <head> interessa. Filhos pesados viram passthrough.
vi.mock('next/font/google', () => ({ Montserrat: () => ({ className: 'font' }) }));
vi.mock('next/script', () => ({
    default: ({ id, children }: { id: string; children?: React.ReactNode }) =>
        React.createElement('script', { 'data-script-id': id }, children),
}));
const { Pass, Nothing } = vi.hoisted(() => ({
    // Fragmento sem import de React: vi.hoisted roda antes dos imports.
    Pass: ({ children }: { children?: unknown }) => children ?? null,
    Nothing: () => null,
}));
vi.mock('@/contexts/ProfileContext', () => ({ ProfileProvider: Pass }));
vi.mock('@/contexts/FavoritesContext', () => ({ FavoritesProvider: Pass }));
vi.mock('@/components/CloudBackground', () => ({ default: Nothing }));
vi.mock('@/components/chat/ChatFAB', () => ({ default: Nothing }));
vi.mock('@/components/auth/GlobalAuthModal', () => ({ default: Nothing }));
vi.mock('@/components/layout/Footer', () => ({ default: Nothing }));
vi.mock('@/components/consent/ConsentBanner', () => ({ default: Nothing }));

import { AuthProvider } from '@/contexts/AuthContext';
import { trackCompleteRegistration, trackViewContent } from '@/lib/analytics';
import RootLayout from '@/app/layout';

const USER_ID = '00000000-0000-4000-8000-000000000001';

function emit(event: string, s: unknown) {
    act(() => {
        for (const cb of auth.callbacks) cb(event, s);
    });
}

async function mountAuth() {
    let unmount = () => {};
    await act(async () => {
        unmount = render(React.createElement(AuthProvider, null, React.createElement('div'))).unmount;
    });
    return unmount;
}

const leads = () =>
    (window.dataLayer ?? []).filter((e) => (e as Record<string, unknown>).event === 'nubo_lead');

beforeEach(() => {
    auth.callbacks.length = 0;
    window.dataLayer = [];
});

// ─── RD85-R1: Lead conta login de conta existente ────────────────────────────
describe('RD85-R1 — Lead é cadastro efetivo, não login de conta existente', () => {
    it('login (verifyOtp → SIGNED_IN) de conta criada há meses NÃO dispara nubo_lead', async () => {
        // auth-js 2.101.1 emite SIGNED_IN em verifyOtp para conta nova E existente;
        // AuthContext.tsx:58 dispara trackLead em todo SIGNED_IN.
        await mountAuth();
        emit('SIGNED_IN', {
            user: {
                id: USER_ID,
                created_at: '2025-01-15T12:00:00.000Z',
                last_sign_in_at: new Date().toISOString(),
            },
        });
        expect(leads()).toHaveLength(0);
    });
});

// ─── RD85-R2: dedupe só vive na memória da aba ───────────────────────────────
describe('RD85-R2 — Lead uma vez por cadastro, não por aba/carregamento', () => {
    it('SIGNED_IN recebido em outra aba (BroadcastChannel) ou após recarregar não repete nubo_lead', async () => {
        // `attributed` é useRef: some a cada carregamento e é separado por aba.
        // auth-js retransmite SIGNED_IN às outras abas via BroadcastChannel.
        const s = { user: { id: USER_ID, created_at: new Date().toISOString() } };

        const unmountTab1 = await mountAuth();
        emit('SIGNED_IN', s);
        unmountTab1();
        auth.callbacks.length = 0;

        await mountAuth(); // segunda aba / página recarregada
        emit('SIGNED_IN', s);

        expect(leads()).toHaveLength(1);
    });
});

// ─── RD85-R3: CompleteRegistration ao refazer match ──────────────────────────
describe('RD85-R3 — CompleteRegistration só na primeira conclusão do onboarding', () => {
    it('"Refazer Match" remonta o mesmo formulário que dispara CompleteRegistration', () => {
        // Inspeção estática (padrão dos reproducers deste repo): o formulário é
        // montado tanto no onboarding incompleto quanto em isRefining, e o
        // submit chama trackCompleteRegistration sem olhar o estado anterior.
        const root = path.resolve(__dirname, '../../src');
        const client = fs.readFileSync(
            path.join(root, 'app/(app)/oportunidades/OpportunitiesClient.tsx'),
            'utf-8',
        );
        const form = fs.readFileSync(
            path.join(root, 'components/match/MatchOnboardingForm.tsx'),
            'utf-8',
        );
        expect(client).toMatch(/!onboardingCompleted \|\| isRefining/);
        expect(form).toMatch(/trackCompleteRegistration\(userId\)/);

        // Contrato: a segunda conclusão (refazer) não é um novo CompleteRegistration.
        window.dataLayer = [];
        trackCompleteRegistration(USER_ID); // onboarding
        trackCompleteRegistration(USER_ID); // refazer match
        const sent = window.dataLayer.filter(
            (e) => (e as Record<string, unknown>).event === 'nubo_complete_registration',
        );
        expect(sent).toHaveLength(1);
    });
});

// ─── RD85-R4: UUID cru no event_id ───────────────────────────────────────────
describe('RD85-R4 — event_id não expõe o UUID do usuário ao terceiro sem decisão formal', () => {
    // TP-7 rev2 Delta GTM 3: "IDs estáveis devem preservar futura dedupe sem
    // expor user UUID ao terceiro sem decisão formal". Runbook: "nunca o id cru".
    // A FORMA da correção (hash, id opaco, outra) é decisão humana.
    it('Lead', async () => {
        await mountAuth();
        emit('SIGNED_IN', { user: { id: USER_ID, created_at: new Date().toISOString() } });
        expect(JSON.stringify(window.dataLayer)).not.toContain(USER_ID);
    });

    it('CompleteRegistration', () => {
        trackCompleteRegistration(USER_ID);
        expect(JSON.stringify(window.dataLayer)).not.toContain(USER_ID);
    });

    it('ViewContent de pessoa logada (subject = user.id)', () => {
        trackViewContent({ unifiedOpportunityId: 'mec_123', subjectId: USER_ID });
        expect(JSON.stringify(window.dataLayer)).not.toContain(USER_ID);
    });
});

// ─── RD85-R5: container carrega antes do opt-in ──────────────────────────────
describe('RD85-R5 — §3.4 guard-rail 1: GTM só carrega após opt-in', () => {
    it('sem escolha registrada, o layout NÃO inclui o snippet gtm.js', () => {
        // layout.tsx:135 renderiza o snippet sempre que NEXT_PUBLIC_GTM_ID existe.
        // O runbook 174cfdea §2.2 descreve exatamente esse desenho (default
        // denied + GTM sempre); o doc f74d1cd9 §3.4 exige container só após
        // opt-in. Conflito de contrato — ver walkthrough, decisão humana.
        const html = renderToStaticMarkup(
            React.createElement(RootLayout, null, React.createElement('div')),
        );
        expect(html).toContain('data-script-id="consent-default"');
        expect(html).not.toContain('googletagmanager.com/gtm.js');
    });
});
