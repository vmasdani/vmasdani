import { fitDimensions, imageFormat, isSupportedImageType, outputImageName, validateImageFile } from '@/lib/image';
import { describe, expect, it } from 'vitest';

describe('fitDimensions', () => {
    it('scales down the longest side and preserves the aspect ratio', () => {
        expect(fitDimensions(4000, 2000, 1600, 1600)).toEqual({ width: 1600, height: 800 });
        expect(fitDimensions(2000, 4000, 1600, 1600)).toEqual({ width: 800, height: 1600 });
    });

    it('never enlarges a smaller image', () => {
        expect(fitDimensions(320, 240, 1600, 1600)).toEqual({ width: 320, height: 240 });
    });

    it('treats a zero limit as unbounded on that axis', () => {
        expect(fitDimensions(4000, 2000, 0, 1000)).toEqual({ width: 2000, height: 1000 });
    });

    it('guards against empty dimensions', () => {
        expect(fitDimensions(0, 100, 100, 100)).toEqual({ width: 0, height: 0 });
    });
});

describe('validateImageFile', () => {
    it('accepts a supported, small image', () => {
        expect(validateImageFile({ type: 'image/png', size: 1024 })).toBeNull();
    });

    it('rejects unsupported types and oversized files', () => {
        expect(validateImageFile({ type: 'application/pdf', size: 1024 })).toMatch(/not supported/);
        expect(validateImageFile({ type: 'image/png', size: 26 * 1024 * 1024 })).toMatch(/25 MB/);
    });
});

describe('isSupportedImageType', () => {
    it('matches case-insensitively', () => {
        expect(isSupportedImageType('IMAGE/JPEG')).toBe(true);
        expect(isSupportedImageType('image/tiff')).toBe(false);
    });
});

describe('imageFormat', () => {
    it('finds a format or falls back to the first', () => {
        expect(imageFormat('image/webp').extension).toBe('webp');
        expect(imageFormat('image/unknown').value).toBe('image/jpeg');
    });
});

describe('outputImageName', () => {
    it('builds a suffixed name with the format extension', () => {
        expect(outputImageName('holiday.png', '-compressed', 'image/webp')).toBe('holiday-compressed.webp');
        expect(outputImageName('no-extension', '-min', 'image/jpeg')).toBe('no-extension-min.jpg');
    });
});
