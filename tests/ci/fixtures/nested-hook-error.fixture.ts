// Fixture: uma falha de asserção conhecida + beforeAll de describe aninhado que
// lança (o JSON do vitest não mostra este erro).
import { beforeAll, describe, expect, it } from 'vitest';

describe('conhecido', () => {
    it('falha de propósito', () => {
        expect(1).toBe(2);
    });
});

describe('grupo com hook quebrado', () => {
    beforeAll(() => {
        throw new Error('beforeAll quebrado de propósito');
    });

    it('nunca roda', () => {
        expect(true).toBe(true);
    });
});
