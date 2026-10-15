// Fixtures do gate de baseline (tests/ci/compare-test-baseline.test.ts).
// Falham DE PROPÓSITO; nunca entram na suíte normal (não casam *.test.*).
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, '../../..'),
    test: {
        include: ['tests/ci/fixtures/*.fixture.ts'],
        environment: 'node',
    },
});
