// Fixture: a asserção passa, mas um erro escapa fora do teste (runtime).
import { expect, it } from 'vitest';

it('passa, mas deixa um erro não tratado', async () => {
    setTimeout(() => {
        throw new Error('boom não tratado de propósito');
    }, 0);
    await new Promise((r) => setTimeout(r, 20));
    expect(1).toBe(1);
});
