// Fixture: todas as asserções passam; o afterAll do arquivo lança.
import { afterAll, expect, it } from 'vitest';

it('passa', () => {
    expect(1).toBe(1);
});

afterAll(() => {
    throw new Error('afterAll quebrado de propósito');
});
