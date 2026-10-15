// NUB-RD-85 (TP-7) — harness de navegador: consentimento × carregamento de
// terceiros, com o app real servido LOCALMENTE. Não é dependência do app.
//
// Prova: o que o NAVEGADOR pede, executa e grava em cada estado de
// consentimento — inclusive o contrato R5 (container só após opt-in).
// Não prova: tags, triggers e consent checks do container GTM real, nem
// recebimento em Meta/Google (task 85d). gtm.js é respondido por um stub
// inerte; nenhum evento sai da máquina.
//
// Travas (o harness ABORTA, sem rodar cenário, se alguma não se cumprir):
//   · BASE_URL só em loopback (localhost, 127.0.0.1, ::1). Nunca preview/prod.
//   · Service Workers bloqueados no contexto.
//   · Interceptação instalada no CONTEXTO antes da primeira navegação: só a
//     origem do app passa; gtm.js recebe o stub; todo o resto é abortado.
//   · WebSocket para fora do loopback é fechado.
//   · Timeouts por ação e por navegação, watchdog global e cleanup em finally.
//
// Uso (ver README.md ao lado):
//   NEXT_PUBLIC_GTM_ID=GTM-TESTE00 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=harness-fake-key npx next dev -p 3123
//   PW_DIR=<pasta com playwright-core> CHROME=<chrome> BASE_URL=http://localhost:3123 \
//   node tests/harness/nub-rd-85/consent-network.mjs

import { createRequire } from 'node:module';
import path from 'node:path';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ACTION_TIMEOUT_MS = 15_000;
const NAV_TIMEOUT_MS = 60_000;
const GLOBAL_TIMEOUT_MS = 8 * 60_000;

const CONSENT_COOKIE = 'nubo:consent';
const POLICY_VERSION = '2026-08-1'; // src/lib/consent.ts CONSENT_POLICY_VERSION
const GTM_PATH = 'www.googletagmanager.com/gtm.js';
// Stub inerte: só conta execuções do container.
const GTM_STUB = 'window.__harnessGtmLoaded = (window.__harnessGtmLoaded || 0) + 1;';
// Cookies que só existiriam se um terceiro tivesse executado de verdade.
const THIRD_PARTY_COOKIE = /^(_fbp|_fbc|_ga|_gid|_gcl_|fr$|IDE$)/;

function abort(msg) {
    console.error(`HARNESS ABORTADO: ${msg}`);
    process.exit(2);
}

// ── Travas de ambiente ───────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3123';
let base;
try {
    base = new URL(BASE_URL);
} catch {
    abort(`BASE_URL inválida: ${BASE_URL}`);
}
if (!['http:', 'https:'].includes(base.protocol)) abort(`protocolo não permitido: ${base.protocol}`);
if (!LOOPBACK_HOSTS.has(base.hostname)) {
    abort(`BASE_URL precisa ser loopback (localhost/127.0.0.1/::1); recebido ${base.hostname}. Nunca rodar contra preview/produção.`);
}
const PAGE = process.env.PAGE_PATH ?? '/';
if (!PAGE.startsWith('/') || PAGE.startsWith('//')) abort(`PAGE_PATH deve ser caminho relativo: ${PAGE}`);

const require = createRequire(path.join(process.env.PW_DIR ?? process.cwd(), 'noop.js'));
const { chromium } = require('playwright-core');

const watchdog = setTimeout(() => {
    console.error('HARNESS: tempo global esgotado');
    process.exit(3);
}, GLOBAL_TIMEOUT_MS);
watchdog.unref();

// ── Cenário ──────────────────────────────────────────────────────────────────

function consentCookie(state, version = POLICY_VERSION, extra = {}) {
    const value = encodeURIComponent(
        JSON.stringify({ state, policyVersion: version, decidedAt: '2026-10-01T10:00:00.000Z' }),
    );
    return { name: CONSENT_COOKIE, value, url: base.origin, ...extra };
}

const GRANTED = { essential: true, analytics: true, advertising: true };

async function snapshot(page) {
    return page.evaluate(() => {
        const dl = (window.dataLayer ?? []).map((e) =>
            e && typeof e === 'object' && 'length' in e && !Array.isArray(e) ? Array.from(e) : e,
        );
        const isConsent = (e, kind) => Array.isArray(e) && e[0] === 'consent' && e[1] === kind;
        const gtmStartIdx = dl.findIndex((e) => e && e.event === 'gtm.js');
        const updates = dl.map((e, i) => (isConsent(e, 'update') ? i : -1)).filter((i) => i >= 0);
        return {
            gtmExecuted: window.__harnessGtmLoaded ?? 0,
            gtmScriptTags: document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]').length,
            defaultIdx: dl.findIndex((e) => isConsent(e, 'default')),
            gtmStartIdx,
            firstUpdateIdx: updates[0] ?? -1,
            lastUpdate: updates.length ? dl[updates.at(-1)][2] : null,
            serviceWorker: !!navigator.serviceWorker?.controller,
            conversionEvents: dl.filter((e) => e && typeof e.event === 'string' && e.event.startsWith('nubo_')).length,
        };
    });
}

async function scenario(browser, name, { cookie, steps, expect: exp }) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const log = { stubbed: 0, intercepted: [], loopbackOther: 0 };
    const errors = [];
    const check = (cond, msg) => {
        if (!cond) errors.push(msg);
    };
    try {
        // Antes de qualquer página existir.
        await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.origin === base.origin || url.protocol === 'data:' || url.protocol === 'blob:') {
                return route.continue();
            }
            if (LOOPBACK_HOSTS.has(url.hostname)) {
                // Supabase/Cloudinha do harness apontam para portas mortas locais.
                log.loopbackOther += 1;
                return route.abort();
            }
            const key = `${url.host}${url.pathname}`;
            if (key === GTM_PATH) {
                log.stubbed += 1;
                return route.fulfill({ status: 200, contentType: 'text/javascript', body: GTM_STUB });
            }
            log.intercepted.push(key);
            return route.abort();
        });
        if (typeof context.routeWebSocket === 'function') {
            await context.routeWebSocket(/.*/, (ws) => {
                const u = new URL(ws.url());
                if (LOOPBACK_HOSTS.has(u.hostname)) return ws.connectToServer();
                log.intercepted.push(`ws:${u.host}`);
                return ws.close();
            });
        }
        if (cookie) await context.addCookies([cookie]);

        const page = await context.newPage();
        page.setDefaultTimeout(ACTION_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
        await page.goto(new URL(PAGE, base).toString(), { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        if (steps) await steps(page);
        await page.waitForTimeout(800);
        const s = await snapshot(page);
        const stubbedFirstLoad = log.stubbed;

        let reloadRequestedGtm = null;
        if (exp.reloadLoadsGtm !== undefined) {
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(1500);
            reloadRequestedGtm = log.stubbed > stubbedFirstLoad;
        }

        const cookies = (await context.cookies()).map((c) => c.name);

        check((stubbedFirstLoad > 0) === exp.gtmLoaded, `gtm.js pedido=${stubbedFirstLoad > 0}, esperado ${exp.gtmLoaded}`);
        check(s.gtmExecuted === (exp.gtmLoaded ? 1 : 0), `container executado ${s.gtmExecuted}x`);
        check(s.gtmScriptTags <= 1, `mais de uma tag do container: ${s.gtmScriptTags}`);
        check(s.defaultIdx > -1, 'consent default ausente');
        check(s.gtmStartIdx === -1 || (s.defaultIdx < s.gtmStartIdx && s.firstUpdateIdx > -1 && s.firstUpdateIdx < s.gtmStartIdx),
            'container subiu antes do consent default/update');
        check(!s.serviceWorker, 'service worker controlando a página');
        check(s.conversionEvents === 0, `evento de conversão sem fluxo de conversão: ${s.conversionEvents}`);
        check(!cookies.some((c) => THIRD_PARTY_COOKIE.test(c)), `cookie de terceiro presente: ${cookies}`);
        if (exp.lastUpdate) {
            for (const [k, v] of Object.entries(exp.lastUpdate)) {
                check(s.lastUpdate?.[k] === v, `consent update ${k}=${s.lastUpdate?.[k]}, esperado ${v}`);
            }
        } else {
            check(s.lastUpdate === null, 'houve consent update sem decisão');
        }
        if (exp.reloadLoadsGtm !== undefined) {
            check(reloadRequestedGtm === exp.reloadLoadsGtm, `após recarregar, gtm.js pedido=${reloadRequestedGtm}, esperado ${exp.reloadLoadsGtm}`);
        }

        return {
            scenario: name,
            ok: errors.length === 0,
            errors,
            gtmRequested: stubbedFirstLoad > 0,
            gtmExecuted: s.gtmExecuted,
            reloadRequestedGtm,
            lastConsentUpdate: s.lastUpdate,
            cookies,
            thirdPartyAborted: [...new Set(log.intercepted)],
            loopbackAborted: log.loopbackOther,
        };
    } catch (err) {
        return { scenario: name, ok: false, errors: [`exceção: ${err?.message ?? err}`] };
    } finally {
        await context.close().catch(() => {});
    }
}

const click = (page, name) => page.getByRole('button', { name, exact: true }).click();

const SCENARIOS = [
    ['ausente', { expect: { gtmLoaded: false } }],
    ['recusado no banner', { steps: (p) => click(p, 'Recusar'), expect: { gtmLoaded: false, lastUpdate: { ad_storage: 'denied', analytics_storage: 'denied' }, reloadLoadsGtm: false } }],
    ['aceito no banner', { steps: (p) => click(p, 'Aceitar todos'), expect: { gtmLoaded: true, lastUpdate: { ad_storage: 'granted', analytics_storage: 'granted' }, reloadLoadsGtm: true } }],
    [
        'só análise de uso',
        {
            steps: async (p) => {
                await click(p, 'Escolher');
                await p.getByLabel(/Análise de uso/).check();
                await click(p, 'Salvar escolha');
            },
            expect: { gtmLoaded: true, lastUpdate: { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied' } },
        },
    ],
    [
        'aceito → revogado pelo rodapé',
        {
            steps: async (p) => {
                await click(p, 'Aceitar todos');
                await p.waitForTimeout(500);
                await click(p, 'Preferências de cookies');
                await click(p, 'Recusar');
            },
            // Na página corrente o container já executou e não é desfeito;
            // vale o update denied e a próxima carga completa sem container.
            expect: { gtmLoaded: true, lastUpdate: { ad_storage: 'denied', analytics_storage: 'denied' }, reloadLoadsGtm: false },
        },
    ],
    ['retorno com aceite salvo', { cookie: consentCookie(GRANTED), expect: { gtmLoaded: true, lastUpdate: { ad_storage: 'granted' } } }],
    ['retorno com recusa salva', { cookie: consentCookie({ essential: true, analytics: false, advertising: false }), expect: { gtmLoaded: false, lastUpdate: { ad_storage: 'denied' } } }],
    ['nova versão do texto (aceite antigo)', { cookie: consentCookie(GRANTED, '2000-01-1'), expect: { gtmLoaded: false } }],
    // Expirado: o navegador descarta o cookie após max-age; simulado com
    // expiração no passado — o estado observável é o de "ausente".
    ['expirado', { cookie: consentCookie(GRANTED, POLICY_VERSION, { expires: 1 }), expect: { gtmLoaded: false } }],
];

let browser;
const results = [];
try {
    browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, timeout: NAV_TIMEOUT_MS });
    for (const [name, opts] of SCENARIOS) {
        results.push(await scenario(browser, name, opts));
    }
} finally {
    await browser?.close().catch(() => {});
}

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} cenários OK`);
for (const f of failed) console.log(`FALHOU ${f.scenario}: ${f.errors.join('; ')}`);
process.exit(failed.length || results.length !== SCENARIOS.length ? 1 : 0);
