import { decodeBase64, encodeBase64 } from '@/lib/base64';
import { describe, expect, it } from 'vitest';

describe('encodeBase64', () => {
    it('encodes ASCII to the known value', () => {
        expect(encodeBase64('hello')).toBe('aGVsbG8=');
    });

    it('preserves multi-byte unicode on a round trip', () => {
        const input = 'héllo 世界 🚀';

        expect(decodeBase64(encodeBase64(input))).toBe(input);
    });

    it('replaces + and / in URL-safe output and drops padding', () => {
        expect(encodeBase64('??>', true)).toBe('Pz8-');
        expect(encodeBase64('???', true)).toBe('Pz8_');
        expect(encodeBase64('hello', true)).toBe('aGVsbG8');
    });
});

describe('decodeBase64', () => {
    it('accepts padded and unpadded input', () => {
        expect(decodeBase64('aGVsbG8=')).toBe('hello');
        expect(decodeBase64('aGVsbG8')).toBe('hello');
    });

    it('accepts the URL-safe alphabet', () => {
        expect(decodeBase64('Pz8-')).toBe('??>');
        expect(decodeBase64('Pz8_')).toBe('???');
    });

    it('ignores whitespace', () => {
        expect(decodeBase64('aGVs bG8=')).toBe('hello');
    });

    it('rejects a bad length', () => {
        expect(() => decodeBase64('abcde')).toThrow(/length/);
    });

    it('rejects bytes that are not valid UTF-8', () => {
        expect(() => decodeBase64('/w==')).toThrow(/UTF-8/);
    });
});
