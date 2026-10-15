// Reporter do vitest que registra o que o reporter JSON NÃO mostra
// (vitest 3.2: o JSON ignora erros não tratados e só traz o primeiro erro do
// ARQUIVO; erro de hook em `describe` aninhado fica invisível).
//
// Grava em $VITEST_FAILURE_REPORT (padrão: vitest-failures.json):
//   { suiteErrors: [{ file, suite, message }], unhandledErrors: [{ message }] }
// `suite` vazio = erro do próprio arquivo (coleta, beforeAll/afterAll do topo).
//
// Uso: vitest run --reporter=json --outputFile=r.json --reporter=./scripts/ci/vitest-failure-reporter.mjs

import { writeFileSync } from 'node:fs';
import path from 'node:path';

function firstLine(err) {
    const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
    return String(msg ?? '').split(/\r?\n/)[0].trim() || '(sem mensagem)';
}

function rel(file) {
    return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function walk(task, fileRel, trail, out) {
    for (const child of task.tasks ?? []) {
        if (child.type !== 'suite') continue;
        const suite = [...trail, child.name].join(' ');
        for (const err of child.result?.errors ?? []) out.push({ file: fileRel, suite, message: firstLine(err) });
        walk(child, fileRel, [...trail, child.name], out);
    }
}

export default class VitestFailureReporter {
    onFinished(files = [], errors = []) {
        const suiteErrors = [];
        for (const file of files) {
            const fileRel = rel(file.filepath);
            for (const err of file.result?.errors ?? []) suiteErrors.push({ file: fileRel, suite: '', message: firstLine(err) });
            walk(file, fileRel, [], suiteErrors);
        }
        const unhandledErrors = (errors ?? []).map((e) => ({ message: firstLine(e) }));
        const out = process.env.VITEST_FAILURE_REPORT || 'vitest-failures.json';
        writeFileSync(out, JSON.stringify({ suiteErrors, unhandledErrors }, null, 2));
    }
}
