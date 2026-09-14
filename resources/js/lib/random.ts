/**
 * Cryptographically secure random helpers shared by the generator tools.
 * randomInt uses rejection sampling so every value in [0, max) is equally
 * likely (a plain `x % max` would skew toward the low end).
 */

export function randomInt(max: number): number {
    if (max <= 0) {
        return 0;
    }

    const limit = Math.floor(0x1_0000_0000 / max) * max;
    const buffer = new Uint32Array(1);

    do {
        crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return buffer[0] % max;
}

export function randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return bytes;
}

export function randomChar(characters: string): string {
    return characters.charAt(randomInt(characters.length));
}

export function shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);

        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}
