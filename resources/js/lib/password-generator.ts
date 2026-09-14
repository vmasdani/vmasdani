import { randomChar, shuffle } from '@/lib/random';

export interface PasswordOptions {
    length: number;
    lowercase: boolean;
    uppercase: boolean;
    digits: boolean;
    symbols: boolean;
    /** Drop characters that look alike (I, l, 1, O, 0, o). */
    excludeAmbiguous: boolean;
}

export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '0123456789';
export const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';
export const AMBIGUOUS = 'Il1O0o';

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
    length: 20,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
};

export function generatePassword(options: PasswordOptions): string {
    const pools = selectedPools(options);

    if (pools.length === 0) {
        throw new Error('Select at least one character set.');
    }

    const length = clampLength(options.length);
    const all = pools.join('');
    const characters: string[] = [];

    // Guarantee one character from each selected set (when the length allows),
    // then fill the rest from the combined pool.
    for (const pool of pools) {
        if (characters.length >= length) {
            break;
        }

        characters.push(randomChar(pool));
    }

    while (characters.length < length) {
        characters.push(randomChar(all));
    }

    return shuffle(characters).join('');
}

export function selectedPools(options: PasswordOptions): string[] {
    const filter = (set: string): string =>
        options.excludeAmbiguous ? [...set].filter((character) => !AMBIGUOUS.includes(character)).join('') : set;

    return [
        options.lowercase ? filter(LOWER) : null,
        options.uppercase ? filter(UPPER) : null,
        options.digits ? filter(DIGITS) : null,
        options.symbols ? filter(SYMBOLS) : null,
    ].filter((pool): pool is string => pool !== null && pool.length > 0);
}

export function clampLength(length: number): number {
    if (!Number.isFinite(length)) {
        return DEFAULT_PASSWORD_OPTIONS.length;
    }

    return Math.max(4, Math.min(256, Math.floor(length)));
}

/** Number of possible passwords, as a base-2 exponent (entropy in bits). */
export function poolEntropy(length: number, poolSize: number): number {
    return clampLength(length) * Math.log2(Math.max(poolSize, 2));
}
