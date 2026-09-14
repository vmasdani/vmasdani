import { randomBytes, randomInt } from '@/lib/random';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function uuidV4(): string {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return formatUuid(bytes);
}

/** RFC 9562 version 7: 48-bit Unix millisecond timestamp, then random. */
export function uuidV7(timestamp = Date.now()): string {
    const bytes = randomBytes(16);
    const time = BigInt(timestamp);

    bytes[0] = Number((time >> 40n) & 0xffn);
    bytes[1] = Number((time >> 32n) & 0xffn);
    bytes[2] = Number((time >> 24n) & 0xffn);
    bytes[3] = Number((time >> 16n) & 0xffn);
    bytes[4] = Number((time >> 8n) & 0xffn);
    bytes[5] = Number(time & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return formatUuid(bytes);
}

/** ULID: 48-bit timestamp + 80 bits of randomness, Crockford Base32. */
export function ulid(timestamp = Date.now()): string {
    let time = timestamp;
    const timeChars = new Array<string>(10);

    for (let i = 9; i >= 0; i--) {
        timeChars[i] = CROCKFORD[time % 32];
        time = Math.floor(time / 32);
    }

    let random = '';

    for (let i = 0; i < 16; i++) {
        random += CROCKFORD[randomInt(32)];
    }

    return timeChars.join('') + random;
}

export type IdentifierKind = 'uuid-v4' | 'uuid-v7' | 'ulid';

export function generateIdentifiers(kind: IdentifierKind, count: number, uppercase = false): string[] {
    const total = Math.max(1, Math.min(500, Math.floor(count)));
    const values: string[] = [];

    for (let i = 0; i < total; i++) {
        const value = kind === 'uuid-v4' ? uuidV4() : kind === 'uuid-v7' ? uuidV7() : ulid();

        values.push(uppercase ? value.toUpperCase() : value);
    }

    return values;
}

function formatUuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
