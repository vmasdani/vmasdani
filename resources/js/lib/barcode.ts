/**
 * Configuration and content helpers for the barcode scanner. Decoding is done
 * by zxing-wasm in the page; these helpers are pure so they stay testable.
 */

/** Where the vendored zxing reader WASM is served from. */
export const SCANNER_WASM_PATH = '/barcode-scanner/zxing_reader.wasm';

/**
 * zxing-wasm resolves its wasm with `locateFile`, which needs an absolute URL
 * when the page is not at the site root. Prefix the page origin.
 */
export function scannerWasmUrl(origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${SCANNER_WASM_PATH}`;
}

/** The commonly used formats, so a scan does not try every symbology first. */
export const COMMON_SCAN_FORMATS = [
    'QRCode',
    'MicroQRCode',
    'DataMatrix',
    'Aztec',
    'PDF417',
    'EAN13',
    'EAN8',
    'UPCA',
    'UPCE',
    'Code128',
    'Code39',
    'Code93',
    'ITF',
    'Codabar',
    'DataBar',
] as const;

export type ScanContentType = 'url' | 'wifi' | 'email' | 'phone' | 'geo' | 'text';

/** Guess what a decoded payload is so the UI can offer the right action. */
export function classifyContent(text: string): ScanContentType {
    const value = text.trim().toLowerCase();

    if (/^https?:\/\//.test(value)) {
        return 'url';
    }

    if (value.startsWith('wifi:')) {
        return 'wifi';
    }

    if (value.startsWith('mailto:') || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        return 'email';
    }

    if (value.startsWith('tel:') || /^\+?[\d\s().-]{7,}$/.test(value)) {
        return 'phone';
    }

    if (value.startsWith('geo:')) {
        return 'geo';
    }

    return 'text';
}

/** A safe href for content that can be opened, or null when it is plain text. */
export function contentHref(text: string): string | null {
    const type = classifyContent(text);

    if (type === 'url') {
        return text.trim();
    }

    if (type === 'email' && !text.trim().toLowerCase().startsWith('mailto:')) {
        return `mailto:${text.trim()}`;
    }

    if (type === 'phone') {
        return text.trim().toLowerCase().startsWith('tel:') ? text.trim() : `tel:${text.trim().replace(/[^\d+]/g, '')}`;
    }

    return null;
}
