import { DEFAULT_OCR_LANGUAGE, OCR_LANGUAGES, normalizeOcrText, ocrCoreUrl, ocrTessdataUrl, ocrTextFileName, ocrWorkerUrl } from '@/lib/ocr';
import { describe, expect, it } from 'vitest';

describe('ocr urls', () => {
    it('prefix the origin for each asset', () => {
        expect(ocrWorkerUrl('https://example.com')).toBe('https://example.com/ocr/worker.min.js');
        expect(ocrCoreUrl('https://example.com')).toBe('https://example.com/ocr');
        expect(ocrTessdataUrl('https://example.com')).toBe('https://example.com/ocr/tessdata');
    });
});

describe('normalizeOcrText', () => {
    it('trims ragged whitespace and collapses blank lines', () => {
        expect(normalizeOcrText('  hello   \n\n\n\nworld  \n')).toBe('hello\n\nworld');
    });
});

describe('ocrTextFileName', () => {
    it('swaps the extension for .txt', () => {
        expect(ocrTextFileName('receipt.png')).toBe('receipt.txt');
        expect(ocrTextFileName('scan')).toBe('scan.txt');
    });
});

describe('languages', () => {
    it('defaults to a language that is bundled', () => {
        expect(OCR_LANGUAGES.map((language) => language.code)).toContain(DEFAULT_OCR_LANGUAGE);
    });
});
