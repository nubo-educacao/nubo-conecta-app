// Fixture: só uma falha de asserção, que a baseline do teste conhece.
import { describe, expect, it } from 'vitest';

describe('conhecido', () => {
    it('falha de propósito', () => {
        expect(1).toBe(2);
    });

    it('passa', () => {
        expect(1).toBe(1);
    });
});
