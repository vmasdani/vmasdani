/**
 * Hashing via the Web Crypto SubtleCrypto API. Only the SHA family is
 * exposed because those are the algorithms browsers implement natively;
 * MD5 is deliberately omitted (broken and not available in SubtleCrypto).
 */

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
    const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));

    return toHex(digest);
}

export async function hashAll(text: string): Promise<Record<HashAlgorithm, string>> {
    const entries = await Promise.all(HASH_ALGORITHMS.map(async (algorithm) => [algorithm, await hashText(text, algorithm)] as const));

    return Object.fromEntries(entries) as Record<HashAlgorithm, string>;
}
