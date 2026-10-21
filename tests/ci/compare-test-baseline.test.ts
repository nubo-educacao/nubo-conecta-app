// Regressões do gate de baseline do CI (revisão 8e95e1f7, P2).
//
// O comparador é executado como PROCESSO, e o que se verifica é o exit code:
// é isso que o CI usa. Duas camadas:
//   · relatórios controlados (o caso reproduzido na revisão e variações);
//   · integração: o vitest de verdade roda fixtures com erro de hook, de
//     suíte aninhada e não tratado, e o comparador precisa reprovar.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const COMPARATOR = path.join(ROOT, 'scripts/ci/compare-test-baseline.mjs');
const REPORTER = path.join(ROOT, 'scripts/ci/vitest-failure-reporter.mjs');
const VITEST = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
const FIXTURE_CONFIG = path.join(ROOT, 'tests/ci/fixtures/vitest.fixtures.config.ts');

let dir: string;
beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'baseline-gate-'));
});
afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

const FILE = path.join(ROOT, 'tests/x/alvo.test.ts');
const REL = 'tests/x/alvo.test.ts';

function write(name: string, content: unknown) {
    const p = path.join(dir, name);
    writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
    return p;
}

function compare(report: unknown, failures: unknown, baselineLines: string[]) {
    const r = report === undefined ? path.join(dir, 'nao-existe.json') : write(`r-${Math.random()}.json`, report);
    const f = failures === undefined ? path.join(dir, 'nao-existe-f.json') : write(`f-${Math.random()}.json`, failures);
    const b = write(`b-${Math.random()}.txt`, baselineLines.join('\n') + '\n');
    const res = spawnSync(process.execPath, [COMPARATOR, r, f, b], { cwd: ROOT, encoding: 'utf8' });
    return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

function report(opts: { status: 'passed' | 'failed'; message?: string; asserts: Array<[string, 'passed' | 'failed']>; success?: boolean }) {
    const failed = opts.asserts.filter(([, s]) => s === 'failed').length;
    return {
        numTotalTests: opts.asserts.length,
        numPassedTests: opts.asserts.length - failed,
        numFailedTests: failed,
        numFailedTestSuites: opts.status === 'failed' ? 1 : 0,
        success: opts.success ?? (opts.status === 'passed' && failed === 0),
        testResults: [
            {
                name: FILE,
                status: opts.status,
                message: opts.message ?? '',
                assertionResults: opts.asserts.map(([fullName, status]) => ({ fullName, status })),
            },
        ],
    };
}

const NO_EXTRA = { suiteErrors: [], unhandledErrors: [] };

describe('comparador de baseline — relatórios controlados', () => {
    it('caso da revisão: arquivo failed, uma asserção aprovada, success=false, baseline vazia → REPROVA', () => {
        const r = compare(
            report({ status: 'failed', asserts: [['ok', 'passed']], success: false }),
            NO_EXTRA,
            [],
        );
        expect(r.code).toBe(1);
        expect(r.out).toContain('[suite error]');
    });

    it('erro de afterAll/hook com asserções aprovadas (registrado pelo reporter) → REPROVA', () => {
        const r = compare(
            report({ status: 'failed', message: 'afterAll falhou', asserts: [['ok', 'passed']], success: false }),
            { suiteErrors: [{ file: REL, suite: '', message: 'afterAll falhou' }], unhandledErrors: [] },
            [],
        );
        expect(r.code).toBe(1);
    });

    it('hook de describe aninhado (invisível no JSON do vitest) → REPROVA mesmo com arquivo já na baseline por asserção', () => {
        const r = compare(
            report({ status: 'failed', asserts: [['conhecido', 'failed'], ['ok', 'passed']], success: false }),
            { suiteErrors: [{ file: REL, suite: 'grupo novo', message: 'beforeAll falhou' }], unhandledErrors: [] },
            [`${REL} :: conhecido`],
        );
        expect(r.code).toBe(1);
        expect(r.out).toContain('grupo novo');
    });

    it('suíte sem nenhuma asserção que falhou na coleta → REPROVA', () => {
        const r = compare(report({ status: 'failed', message: 'SyntaxError', asserts: [], success: false }), NO_EXTRA, []);
        expect(r.code).toBe(1);
    });

    it('erro não tratado (runtime fora de teste) → REPROVA', () => {
        const r = compare(
            report({ status: 'passed', asserts: [['ok', 'passed']], success: true }),
            { suiteErrors: [], unhandledErrors: [{ message: 'Error: boom' }] },
            [],
        );
        expect(r.code).toBe(1);
        expect(r.out).toContain('boom');
    });

    it('falha de asserção nova → REPROVA', () => {
        const r = compare(report({ status: 'failed', asserts: [['nova', 'failed']], success: false }), NO_EXTRA, []);
        expect(r.code).toBe(1);
    });

    it('relatório do vitest ausente ou inválido → REPROVA', () => {
        expect(compare(undefined, NO_EXTRA, []).code).toBe(1);
        expect(compare('{nao json', NO_EXTRA, []).code).toBe(1);
        expect(compare({ testResults: [] }, NO_EXTRA, []).code).toBe(1);
    });

    it('relatório de falhas de suíte/runtime ausente ou inválido → REPROVA (falha fechada)', () => {
        const ok = report({ status: 'passed', asserts: [['ok', 'passed']], success: true });
        expect(compare(ok, undefined, []).code).toBe(1);
        expect(compare(ok, '{', []).code).toBe(1);
        expect(compare(ok, { suiteErrors: 'x' }, []).code).toBe(1);
    });

    it('contagem de falhas inconsistente com as asserções listadas → REPROVA', () => {
        const r = report({ status: 'failed', asserts: [['conhecido', 'failed']], success: false });
        r.numFailedTests = 2;
        expect(compare(r, NO_EXTRA, [`${REL} :: conhecido`]).code).toBe(1);
    });

    it('somente as falhas EXATAS conhecidas → APROVA', () => {
        const r = compare(
            report({ status: 'failed', asserts: [['conhecido', 'failed'], ['ok', 'passed']], success: false }),
            NO_EXTRA,
            [`${REL} :: conhecido`],
        );
        expect(r.code).toBe(0);
    });

    it('erro de suíte conhecido e listado → APROVA', () => {
        const r = compare(
            report({ status: 'failed', message: 'SyntaxError', asserts: [], success: false }),
            { suiteErrors: [{ file: REL, suite: '', message: 'SyntaxError' }], unhandledErrors: [] },
            [`${REL} :: [suite error]`],
        );
        expect(r.code).toBe(0);
    });

    it('falha conhecida que passou a passar → APROVA e avisa para sair da baseline', () => {
        const r = compare(report({ status: 'passed', asserts: [['conhecido', 'passed']] }), NO_EXTRA, [`${REL} :: conhecido`]);
        expect(r.code).toBe(0);
        expect(r.out).toContain('agora passa');
    });
});

// ─── Integração: vitest real + reporter + comparador ─────────────────────────

function runFixture(fixture: string, baseline: string[]) {
    const json = path.join(dir, `${fixture}.json`);
    const failures = path.join(dir, `${fixture}.failures.json`);
    spawnSync(
        process.execPath,
        [VITEST, 'run', '--config', FIXTURE_CONFIG, `tests/ci/fixtures/${fixture}`, '--reporter=json', `--outputFile=${json}`, `--reporter=${REPORTER}`],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VITEST_FAILURE_REPORT: failures, CI: '1' }, timeout: 120_000 },
    );
    expect(existsSync(json)).toBe(true);
    expect(existsSync(failures)).toBe(true);
    const b = write(`${fixture}.baseline.txt`, baseline.join('\n') + '\n');
    const res = spawnSync(process.execPath, [COMPARATOR, json, failures, b], { cwd: ROOT, encoding: 'utf8' });
    return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

describe('comparador de baseline — vitest real', { timeout: 180_000 }, () => {
    it('afterAll que lança com todas as asserções aprovadas → REPROVA', () => {
        const r = runFixture('after-all-error.fixture.ts', []);
        expect(r.code).toBe(1);
        expect(r.out).toContain('after-all-error.fixture.ts :: [suite error]');
    });

    it('beforeAll de describe aninhado que lança → REPROVA, mesmo com a falha de asserção do arquivo já conhecida', () => {
        const r = runFixture('nested-hook-error.fixture.ts', [
            'tests/ci/fixtures/nested-hook-error.fixture.ts :: conhecido falha de propósito',
        ]);
        expect(r.code).toBe(1);
        expect(r.out).toContain('grupo com hook quebrado');
    });

    it('erro não tratado durante a execução → REPROVA', () => {
        const r = runFixture('unhandled-error.fixture.ts', []);
        expect(r.code).toBe(1);
        expect(r.out).toContain('[unhandled]');
    });

    it('arquivo só com a falha conhecida → APROVA', () => {
        const r = runFixture('known-failure.fixture.ts', ['tests/ci/fixtures/known-failure.fixture.ts :: conhecido falha de propósito']);
        expect(r.code).toBe(0);
    });
});
