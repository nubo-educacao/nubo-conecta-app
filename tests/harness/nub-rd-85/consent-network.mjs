// NUB-RD-85 (TP-7) — harness de navegador para consentimento × carregamento de
// terceiros. NÃO roda no `pnpm test` e não é dependência do app.
//
// O que prova: o que o NAVEGADOR pede a terceiros em cada estado de
// consentimento, com o app real servido localmente.
// O que NÃO prova: comportamento do container GTM real (tags, consent checks,
// triggers) nem recebimento em Meta/Google. Toda requisição a host que não seja
// o app local é interceptada ANTES da primeira navegação; gtm.js é respondido
// por um stub inerte e todo o resto é abortado. Nenhum evento sai da máquina.
//
// Uso (ver README.md ao lado):
//   NEXT_PUBLIC_GTM_ID=GTM-TESTE00 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npx next dev -p 3123
//   PW_DIR=<pasta com playwright-core> CHROME=<chrome.exe> BASE_URL=http://localhost:3123 \
//   node tests/harness/nub-rd-85/consent-network.mjs

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.env.PW_DIR ?? process.cwd(), 'noop.js'));
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3123';
const PAGE = process.env.PAGE_PATH ?? '/';
const local = new URL(BASE_URL).host;

const CONSENT_COOKIE = 'nubo:consent';
const POLICY_VERSION = '2026-08-1'; // src/lib/consent.ts — conferido no relatório

// Stub inerte: só marca que o container foi pedido e executado.
const GTM_STUB = 'window.__harnessGtmLoaded = (window.__harnessGtmLoaded || 0) + 1;';

function consentCookie(state, version = POLICY_VERSION) {
    const value = encodeURIComponent(
        JSON.stringify({ state, policyVersion: version, decidedAt: '2026-10-01T10:00:00.000Z' }),
    );
    return { name: CONSENT_COOKIE, value, url: BASE_URL };
}

async function scenario(browser, name, { cookie, steps } = {}) {
    const context = await browser.newContext();
    const thirdParty = [];

    // Interceptação instalada antes de qualquer navegação.
    await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.host === local || url.protocol === 'data:') return route.continue();
        thirdParty.push(`${url.host}${url.pathname}`);
        if (url.host === 'www.googletagmanager.com' && url.pathname === '/gtm.js') {
            return route.fulfill({ status: 200, contentType: 'text/javascript', body: GTM_STUB });
        }
        return route.abort();
    });
    if (cookie) await context.addCookies([cookie]);

    const page = await context.newPage();
    await page.goto(new URL(PAGE, BASE_URL).toString(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    if (steps) await steps(page);
    await page.waitForTimeout(500);

    const snap = await page.evaluate(() => {
        const dl = (window.dataLayer ?? []).map((e) => {
            // gtag() empurra `arguments`; normaliza para array.
            if (e && typeof e === 'object' && 'length' in e && !Array.isArray(e)) return Array.from(e);
            return e;
        });
        const consentCalls = dl.filter((e) => Array.isArray(e) && e[0] === 'consent');
        const gtmStartIdx = dl.findIndex((e) => e && e.event === 'gtm.js');
        const defaultIdx = dl.findIndex((e) => Array.isArray(e) && e[1] === 'default');
        return {
            gtmExecuted: window.__harnessGtmLoaded ?? 0,
            consentCalls,
            defaultBeforeGtm: defaultIdx !== -1 && (gtmStartIdx === -1 || defaultIdx < gtmStartIdx),
            bannerVisible: !!document.querySelector('[role="dialog"][aria-label="Sua privacidade"]'),
            cookieNames: document.cookie.split('; ').map((c) => c.split('=')[0]).filter(Boolean),
            conversionEvents: dl.filter((e) => e && typeof e.event === 'string' && e.event.startsWith('nubo_')),
        };
    });
    const stored = (await context.cookies()).find((c) => c.name === CONSENT_COOKIE);
    await context.close();

    return {
        scenario: name,
        thirdPartyRequests: thirdParty,
        gtmJsRequested: thirdParty.some((r) => r === 'www.googletagmanager.com/gtm.js'),
        ...snap,
        lastConsentUpdate: snap.consentCalls.filter((c) => c[1] === 'update').at(-1)?.[2] ?? null,
        storedConsent: stored ? JSON.parse(decodeURIComponent(stored.value)) : null,
    };
}

const clickByName = (page, name) => page.getByRole('button', { name, exact: true }).click();

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
const results = [];
results.push(await scenario(browser, 'ausente'));
results.push(await scenario(browser, 'recusado', { steps: (p) => clickByName(p, 'Recusar') }));
results.push(await scenario(browser, 'aceito', { steps: (p) => clickByName(p, 'Aceitar todos') }));
results.push(
    await scenario(browser, 'alterado (só análise de uso)', {
        steps: async (p) => {
            await clickByName(p, 'Escolher');
            await p.getByLabel(/Análise de uso/).check();
            await clickByName(p, 'Salvar escolha');
        },
    }),
);
results.push(
    await scenario(browser, 'aceito → revogado pelo rodapé', {
        steps: async (p) => {
            await clickByName(p, 'Aceitar todos');
            await clickByName(p, 'Preferências de cookies');
            await clickByName(p, 'Recusar');
        },
    }),
);
results.push(
    await scenario(browser, 'retorno com aceite salvo', {
        cookie: consentCookie({ essential: true, analytics: true, advertising: true }),
    }),
);
results.push(
    await scenario(browser, 'nova versão do texto (aceite antigo)', {
        cookie: consentCookie({ essential: true, analytics: true, advertising: true }, '2000-01-1'),
    }),
);
// Expirado: o navegador descarta o cookie após max-age (180 dias); o estado
// observável é idêntico ao "ausente". Simulado com expiração no passado.
results.push(
    await scenario(browser, 'expirado', {
        cookie: { ...consentCookie(GRANTED_STATE()), expires: 1 },
    }),
);
await browser.close();

function GRANTED_STATE() {
    return { essential: true, analytics: true, advertising: true };
}

console.log(JSON.stringify(results, null, 2));
