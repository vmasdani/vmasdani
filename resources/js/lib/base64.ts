/**
 * UTF-8 safe Base64, with optional URL-safe alphabet (RFC 4648 section 5).
 *
 * The browser's atob/btoa only understand latin1, so text is round-tripped
 * through TextEncoder/TextDecoder to preserve multi-byte characters.
 */

export function encodeBase64(input: string, urlSafe = false): string {
    const bytes = new TextEncoder().encode(input);
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    const encoded = btoa(binary);

    return urlSafe ? toUrlSafe(encoded) : encoded;
}

export function decodeBase64(input: string): string {
    const normalized = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');

    if (normalized.length % 4 === 1) {
        throw new Error('This is not valid Base64 (its length is wrong).');
    }

    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

    let binary: string;

    try {
        binary = atob(padded);
    } catch {
        throw new Error('This is not valid Base64.');
    }

    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        throw new Error('Decoded bytes are not valid UTF-8 text.');
    }
}

function toUrlSafe(encoded: string): string {
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
