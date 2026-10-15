// Gate de baseline do CI: falhas antigas e conhecidas não podem esconder
// falha nova (revisão 8e95e1f7, P2).
//
//   node scripts/ci/compare-test-baseline.mjs <vitest-report.json> <vitest-failures.json> <baseline.txt>
//
// Entradas:
//   · relatório JSON do vitest (asserções);
//   · relatório de scripts/ci/vitest-failure-reporter.mjs (erros de suíte,
//     hooks aninhados e erros não tratados — o JSON do vitest não os mostra);
//   · baseline: uma falha conhecida por linha (ver tests/baseline-failures.txt).
//
// FALHA FECHADA (exit 1): qualquer entrada ausente ou ilegível; qualquer falha
// fora da baseline — asserção, erro de suíte/hook/coleta, erro não tratado;
// arquivo marcado como falho sem causa listada; contagens incoerentes; ou
// `success=false` sem nenhuma falha identificada. Falha conhecida que passou a
// passar só gera aviso, para a lista encolher.

import { readFileSync } from 'node:fs';
import path from 'node:path';

const [reportPath, failuresPath, baselinePath] = process.argv.slice(2);
if (!reportPath || !failuresPath || !baselinePath) {
    console.error('uso: compare-test-baseline.mjs <vitest-report.json> <vitest-failures.json> <baseline.txt>');
    process.exit(2);
}

function fail(msg) {
    console.log(`::error::${msg}`);
    process.exit(1);
}

function readJson(p, what) {
    try {
        return JSON.parse(readFileSync(p, 'utf8'));
    } catch (err) {
        fail(`${what} ausente ou ilegível (${p}): ${err.message}`);
    }
}

const report = readJson(reportPath, 'relatório do vitest');
if (!report || !Array.isArray(report.testResults) || report.testResults.length === 0) {
    fail('relatório do vitest sem resultados: a suíte não rodou.');
}
const extra = readJson(failuresPath, 'relatório de erros de suíte/runtime');
if (!extra || !Array.isArray(extra.suiteErrors) || !Array.isArray(extra.unhandledErrors)) {
    fail('relatório de erros de suíte/runtime em formato inválido.');
}

let baselineText;
try {
    baselineText = readFileSync(baselinePath, 'utf8');
} catch (err) {
    fail(`baseline ausente (${baselinePath}): ${err.message}`);
}
const baseline = new Set(
    baselineText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
);

const root = process.cwd();
const rel = (p) => (path.isAbsolute(p) ? path.relative(root, p) : p).split(path.sep).join('/');

const failures = new Set();
let failedAssertions = 0;

const suiteErrorsByFile = new Map();
for (const e of extra.suiteErrors) {
    const file = rel(String(e.file ?? ''));
    const key = e.suite ? `${file} :: [suite error] ${e.suite}` : `${file} :: [suite error]`;
    failures.add(key);
    suiteErrorsByFile.set(file, (suiteErrorsByFile.get(file) ?? 0) + 1);
}
for (const e of extra.unhandledErrors) failures.add(`[unhandled] ${String(e.message ?? '').trim()}`);

for (const file of report.testResults) {
    const name = rel(file.name);
    const asserts = file.assertionResults ?? [];
    const failedHere = asserts.filter((a) => a.status === 'failed');
    failedAssertions += failedHere.length;
    for (const a of failedHere) failures.add(`${name} :: ${a.fullName}`);

    const fileError = typeof file.message === 'string' && file.message.trim() !== '';
    const explained = (suiteErrorsByFile.get(name) ?? 0) > 0;
    // Arquivo falho sem asserção falha (hook/coleta/runtime) ou com erro de
    // arquivo que o reporter não registrou: nunca passa calado.
    if (!explained && (fileError || (file.status === 'failed' && failedHere.length === 0))) {
        failures.add(`${name} :: [suite error]`);
    }
}

if (typeof report.numFailedTests === 'number' && report.numFailedTests !== failedAssertions) {
    fail(`contagem incoerente: numFailedTests=${report.numFailedTests}, asserções falhas listadas=${failedAssertions}.`);
}
if (report.success === false && failures.size === 0) {
    fail('o vitest reportou falha (success=false) sem nenhuma falha identificada.');
}

const novas = [...failures].filter((f) => !baseline.has(f)).sort();
const resolvidas = [...baseline].filter((f) => !failures.has(f)).sort();

console.log(
    `testes: ${report.numTotalTests} · passaram: ${report.numPassedTests} · asserções falhas: ${failedAssertions} · ` +
        `erros de suíte: ${extra.suiteErrors.length} · não tratados: ${extra.unhandledErrors.length} · ` +
        `falhas conhecidas na lista: ${baseline.size}`,
);
for (const f of resolvidas) console.log(`::notice::falha antiga agora passa (remover da baseline): ${f}`);
if (novas.length) {
    for (const f of novas) console.log(`::error::falha NOVA fora da baseline: ${f}`);
    process.exit(1);
}
console.log('nenhuma falha nova em relação à baseline.');
