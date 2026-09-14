import { decodeUrl, encodeUrl } from '@/lib/url-codec';
import { describe, expect, it } from 'vitest';

describe('encodeUrl', () => {
    it('escapes reserved characters in component mode', () => {
        expect(encodeUrl('a b&c=d')).toBe('a%20b%26c%3Dd');
    });

    it('keeps URL structure in full mode', () => {
        expect(encodeUrl('https://x.com/a b?q=1&r=2', 'full')).toBe('https://x.com/a%20b?q=1&r=2');
    });

    it('encodes unicode', () => {
        expect(encodeUrl('café')).toBe('caf%C3%A9');
    });
});

describe('decodeUrl', () => {
    it('reverses percent-encoding', () => {
        expect(decodeUrl('a%20b%26c%3Dd')).toBe('a b&c=d');
    });

    it('round-trips unicode', () => {
        const input = 'café ☕';

        expect(decodeUrl(encodeUrl(input))).toBe(input);
    });

    it('rejects malformed percent-encoding', () => {
        expect(() => decodeUrl('%')).toThrow(/percent/);
        expect(() => decodeUrl('%E0%A4%A')).toThrow();
    });
});
