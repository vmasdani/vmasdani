import { generateIdentifiers, ulid, uuidV4, uuidV7 } from '@/lib/identifiers';
import { describe, expect, it } from 'vitest';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe('uuidV4', () => {
    it('matches the v4 shape with the right version and variant', () => {
        const value = uuidV4();

        expect(value).toMatch(UUID_RE);
        expect(value[14]).toBe('4');
        expect('89ab').toContain(value[19]);
    });

    it('is unique across many calls', () => {
        const values = new Set(Array.from({ length: 200 }, () => uuidV4()));

        expect(values.size).toBe(200);
    });
});

describe('uuidV7', () => {
    it('matches the v7 shape with the right version and variant', () => {
        const value = uuidV7();

        expect(value).toMatch(UUID_RE);
        expect(value[14]).toBe('7');
        expect('89ab').toContain(value[19]);
    });

    it('sorts by timestamp', () => {
        expect(uuidV7(1_000) < uuidV7(2_000)).toBe(true);
    });
});

describe('ulid', () => {
    it('is 26 Crockford Base32 characters', () => {
        expect(ulid()).toMatch(ULID_RE);
    });

    it('sorts by timestamp', () => {
        expect(ulid(1_000) < ulid(2_000)).toBe(true);
    });
});

describe('generateIdentifiers', () => {
    it('returns the requested count', () => {
        expect(generateIdentifiers('uuid-v4', 25)).toHaveLength(25);
    });

    it('can upper-case the output', () => {
        const [value] = generateIdentifiers('ulid', 1, true);

        expect(value).toBe(value.toUpperCase());
    });
});
