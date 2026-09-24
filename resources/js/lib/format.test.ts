import { baseName, formatBytes, savedPercent, suffixedFileName } from '@/lib/format';
import { describe, expect, it } from 'vitest';

describe('formatBytes', () => {
    it('formats bytes, kilobytes and megabytes', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(2048)).toBe('2.0 KB');
        expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});

describe('baseName', () => {
    it('drops the extension and falls back for empty names', () => {
        expect(baseName('holiday.photo.jpeg')).toBe('holiday.photo');
        expect(baseName('.gitignore')).toBe('file');
    });
});

describe('suffixedFileName', () => {
    it('appends a suffixed, normalised extension', () => {
        expect(suffixedFileName('photo.png', '-compressed', 'webp')).toBe('photo-compressed.webp');
        expect(suffixedFileName('photo.png', '-compressed', '.webp')).toBe('photo-compressed.webp');
    });
});

describe('savedPercent', () => {
    it('reports the shrink percentage and clamps impossible values', () => {
        expect(savedPercent(1000, 400)).toBe(60);
        expect(savedPercent(1000, 1000)).toBe(0);
        expect(savedPercent(1000, 1200)).toBe(0);
        expect(savedPercent(0, 10)).toBe(0);
    });
});
