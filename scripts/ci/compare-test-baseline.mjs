// Compara o relatório JSON do vitest com a lista de falhas antigas conhecidas.
//
// Falha (exit 1) se aparecer QUALQUER falha fora da lista, ou se o relatório
// estiver vazio/ilegível — falha antiga não pode esconder regressão nova.
// Falha antiga que passou a passar só gera aviso, para a lista encolher.
//
//   node scripts/ci/compare-test-baseline.mjs vitest-report.json tests/baseline-failures.txt

import { readFileSync } from 'node:fs';
import path from 'node:path';

const [reportPath, baselinePath] = process.argv.slice(2);
if (!reportPath || !baselinePath) {
    console.error('uso: compare-test-baseline.mjs <vitest-report.json> <baseline.txt>');
    process.exit(2);
}

let report;
try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
    console.error(`relatório do vitest ilegível (${reportPath}): ${err.message}`);
    process.exit(1);
}
if (!Array.isArray(report.testResults) || report.testResults.length === 0) {
    console.error('relatório do vitest sem resultados: a suíte não rodou.');
    process.exit(1);
}

const root = process.cwd();
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

const failures = new Set();
for (const file of report.testResults) {
    const name = rel(file.name);
    const asserts = file.assertionResults ?? [];
    if (file.status === 'failed' && asserts.length === 0) failures.add(`${name} :: [suite error]`);
    for (const a of asserts) if (a.status === 'failed') failures.add(`${name} :: ${a.fullName}`);
}

const baseline = new Set(
    readFileSync(baselinePath, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
);

const novas = [...failures].filter((f) => !baseline.has(f)).sort();
const resolvidas = [...baseline].filter((f) => !failures.has(f)).sort();

console.log(
    `testes: ${report.numTotalTests} · passaram: ${report.numPassedTests} · falharam: ${report.numFailedTests} · ` +
        `falhas conhecidas na lista: ${baseline.size}`,
);
for (const f of resolvidas) console.log(`::notice::falha antiga agora passa (remover da baseline): ${f}`);
if (novas.length) {
    for (const f of novas) console.log(`::error::falha NOVA fora da baseline: ${f}`);
    process.exit(1);
}
console.log('nenhuma falha nova em relação à baseline.');
