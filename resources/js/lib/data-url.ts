/**
 * Parsing and conversion for data URLs (`data:image/png;base64,...`). The
 * parsing half is pure and node-testable; `dataUrlToBlob` is browser-only.
 */

export interface ParsedDataUrl {
    mime: string;
    /** The raw Base64 payload, without the `data:` prefix or whitespace. */
    base64: string;
}

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/;

export function parseDataUrl(input: string): ParsedDataUrl {
    const match = DATA_URL_PATTERN.exec(input.trim());

    if (match === null) {
        throw new Error('That does not look like a data URL. It should start with "data:".');
    }

    if (match[2] !== ';base64') {
        throw new Error('Only Base64-encoded data URLs are supported.');
    }

    const mime = (match[1] || 'text/plain').toLowerCase();
    const base64 = match[3].replace(/\s+/g, '');

    if (base64.length === 0 || base64.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(base64)) {
        throw new Error('The Base64 payload is not valid.');
    }

    return { mime, base64 };
}

const EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
};

/** A file extension (no dot) for a MIME type, falling back to `bin`. */
export function extensionForMime(mime: string): string {
    return EXTENSIONS[mime.toLowerCase()] ?? 'bin';
}

/** Confirm the input is a Base64 data URL of an image type. */
export function isImageDataUrl(input: string): boolean {
    try {
        return parseDataUrl(input).mime.startsWith('image/');
    } catch {
        return false;
    }
}

/**
 * Turn a parsed data URL into a Blob. Browser-only (uses atob).
 */
export function dataUrlToBlob(input: string): Blob {
    const { mime, base64 } = parseDataUrl(input);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mime });
}
