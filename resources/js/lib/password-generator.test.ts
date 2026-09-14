import { AMBIGUOUS, clampLength, DEFAULT_PASSWORD_OPTIONS, generatePassword, poolEntropy, selectedPools } from '@/lib/password-generator';
import { describe, expect, it } from 'vitest';

describe('generatePassword', () => {
    it('honours the requested length', () => {
        expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 32 })).toHaveLength(32);
        expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 8 })).toHaveLength(8);
    });

    it('only uses the selected character sets', () => {
        const password = generatePassword({
            length: 200,
            lowercase: false,
            uppercase: false,
            digits: true,
            symbols: false,
            excludeAmbiguous: false,
        });

        expect(password).toMatch(/^[0-9]+$/);
    });

    it('includes at least one character from every selected set', () => {
        const password = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 10 });

        expect(password).toMatch(/[a-z]/);
        expect(password).toMatch(/[A-Z]/);
        expect(password).toMatch(/[0-9]/);
        expect(password).not.toMatch(/^[A-Za-z0-9]+$/);
    });

    it('drops ambiguous characters when asked', () => {
        const password = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 256, excludeAmbiguous: true });

        for (const character of AMBIGUOUS) {
            expect(password).not.toContain(character);
        }
    });

    it('throws when no character set is selected', () => {
        expect(() =>
            generatePassword({ length: 12, lowercase: false, uppercase: false, digits: false, symbols: false, excludeAmbiguous: false }),
        ).toThrow(/character set/);
    });
});

describe('selectedPools', () => {
    it('returns one pool per selected set', () => {
        expect(selectedPools(DEFAULT_PASSWORD_OPTIONS)).toHaveLength(4);
    });
});

describe('clampLength', () => {
    it('clamps into the supported range', () => {
        expect(clampLength(1)).toBe(4);
        expect(clampLength(10_000)).toBe(256);
        expect(clampLength(Number.NaN)).toBe(DEFAULT_PASSWORD_OPTIONS.length);
    });
});

describe('poolEntropy', () => {
    it('scales with the pool size', () => {
        expect(poolEntropy(20, 95)).toBeGreaterThan(poolEntropy(20, 26));
    });
});
