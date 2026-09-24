/**
 * Tesseract OCR helpers. The engine (worker + WASM core + language data) is
 * self-hosted under /ocr; the worker is created in the page. These helpers are
 * pure so they stay testable.
 */

export interface OcrLanguage {
    code: string;
    label: string;
}

export const OCR_LANGUAGES: OcrLanguage[] = [
    { code: 'eng', label: 'English' },
    { code: 'ind', label: 'Indonesian' },
];

export const DEFAULT_OCR_LANGUAGE = 'eng';

export const OCR_WORKER_PATH = '/ocr/worker.min.js';
export const OCR_CORE_PATH = '/ocr';
export const OCR_TESSDATA_PATH = '/ocr/tessdata';

function absolute(path: string, origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${path}`;
}

export function ocrWorkerUrl(origin?: string): string {
    return absolute(OCR_WORKER_PATH, origin);
}

export function ocrCoreUrl(origin?: string): string {
    return absolute(OCR_CORE_PATH, origin);
}

export function ocrTessdataUrl(origin?: string): string {
    return absolute(OCR_TESSDATA_PATH, origin);
}

/**
 * Tidy raw OCR output: trim trailing spaces per line, collapse runs of blank
 * lines and trim the ends, so the copyable text is not full of ragged gaps.
 */
export function normalizeOcrText(text: string): string {
    return text
        .split('\n')
        .map((line) => line.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function ocrTextFileName(originalName: string): string {
    const base = originalName.replace(/\.[^/.]+$/, '') || 'image';

    return `${base}.txt`;
}
