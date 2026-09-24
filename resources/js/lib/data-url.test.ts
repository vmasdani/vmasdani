import { extensionForMime, isImageDataUrl, parseDataUrl } from '@/lib/data-url';
import { describe, expect, it } from 'vitest';

const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('parseDataUrl', () => {
    it('splits the MIME type from the Base64 payload', () => {
        const parsed = parseDataUrl(PNG_1x1);

        expect(parsed.mime).toBe('image/png');
        expect(parsed.base64).toMatch(/^iVBOR/);
    });

    it('strips whitespace inside the payload', () => {
        expect(parseDataUrl('data:text/plain;base64,aGVs\nbG8=').base64).toBe('aGVsbG8=');
    });

    it('rejects strings that are not data URLs', () => {
        expect(() => parseDataUrl('https://example.com/a.png')).toThrow(/data URL/);
    });

    it('rejects percent-encoded (non-Base64) data URLs', () => {
        expect(() => parseDataUrl('data:text/plain,hello')).toThrow(/Base64/);
    });

    it('rejects a malformed payload', () => {
        expect(() => parseDataUrl('data:text/plain;base64,****')).toThrow(/not valid/);
    });
});

describe('extensionForMime', () => {
    it('maps common image types', () => {
        expect(extensionForMime('image/png')).toBe('png');
        expect(extensionForMime('image/jpeg')).toBe('jpg');
        expect(extensionForMime('image/svg+xml')).toBe('svg');
    });

    it('falls back to bin for unknown types', () => {
        expect(extensionForMime('application/x-thing')).toBe('bin');
    });
});

describe('isImageDataUrl', () => {
    it('accepts image data URLs and rejects others', () => {
        expect(isImageDataUrl(PNG_1x1)).toBe(true);
        expect(isImageDataUrl('data:application/pdf;base64,AAAA')).toBe(false);
        expect(isImageDataUrl('nope')).toBe(false);
    });
});
