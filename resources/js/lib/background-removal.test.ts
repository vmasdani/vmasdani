import {
    BACKGROUND_REMOVAL_MODELS,
    backgroundRemovalConfig,
    backgroundRemovalPublicPath,
    formatBytes,
    isSupportedImageType,
    resultFileName,
    validateImageFile,
} from '@/lib/background-removal';
import { describe, expect, it } from 'vitest';

describe('backgroundRemovalConfig', () => {
    it('defaults to the high-quality model on the self-hosted path', () => {
        expect(backgroundRemovalConfig('isnet_fp16', 'https://example.com')).toEqual({
            publicPath: 'https://example.com/background-removal/',
            model: 'isnet_fp16',
            device: 'cpu',
            output: { format: 'image/png' },
        });
    });

    it('honours an explicit model choice', () => {
        expect(backgroundRemovalConfig('isnet_quint8', 'https://example.com').model).toBe('isnet_quint8');
    });
});

describe('backgroundRemovalPublicPath', () => {
    it('makes the path absolute, as new URL() requires', () => {
        expect(backgroundRemovalPublicPath('https://vmasdani.my.id')).toBe('https://vmasdani.my.id/background-removal/');
    });
});

describe('isSupportedImageType', () => {
    it('accepts common photo formats', () => {
        expect(isSupportedImageType('image/png')).toBe(true);
        expect(isSupportedImageType('image/jpeg')).toBe(true);
        expect(isSupportedImageType('image/webp')).toBe(true);
    });

    it('rejects non-images and mismatched casing safely', () => {
        expect(isSupportedImageType('text/plain')).toBe(false);
        expect(isSupportedImageType('')).toBe(false);
    });
});

describe('validateImageFile', () => {
    it('passes a reasonable image', () => {
        expect(validateImageFile({ type: 'image/png', size: 1024 * 1024 })).toBeNull();
    });

    it('rejects unsupported types', () => {
        expect(validateImageFile({ type: 'application/pdf', size: 100 })).toMatch(/not supported/);
    });

    it('rejects oversized uploads', () => {
        expect(validateImageFile({ type: 'image/jpeg', size: 26 * 1024 * 1024 })).toMatch(/25 MB/);
    });
});

describe('formatBytes', () => {
    it('formats the model sizes the selector shows', () => {
        expect(formatBytes(88_152_708)).toBe('84.1 MB');
        expect(formatBytes(44_348_940)).toBe('42.3 MB');
    });
});

describe('resultFileName', () => {
    it('reuses the original name with a transparent suffix', () => {
        expect(resultFileName('photo.jpg')).toBe('photo-transparent.png');
    });

    it('handles names without an extension', () => {
        expect(resultFileName('selfie')).toBe('selfie-transparent.png');
    });
});

describe('model options', () => {
    it('exposes both models in order', () => {
        expect(BACKGROUND_REMOVAL_MODELS.map((option) => option.value)).toEqual(['isnet_fp16', 'isnet_quint8']);
    });
});
