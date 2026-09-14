/**
 * Password strength estimation.
 *
 * This is a transparent heuristic, not a black box: entropy from length and
 * character variety, reduced by the patterns that make a password guessable
 * (common-password lists, repeats, sequences, dates). It is in the same
 * family as zxcvbn but much smaller, so treat the score as guidance rather
 * than a proof.
 */

export type PasswordVerdict = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordAnalysis {
    score: 0 | 1 | 2 | 3 | 4;
    verdict: PasswordVerdict;
    entropy: number;
    guesses: number;
    pool: number;
    onlineCrackTime: string;
    offlineCrackTime: string;
    warnings: string[];
    suggestions: string[];
}

const VERDICTS: PasswordVerdict[] = ['very-weak', 'weak', 'fair', 'strong', 'very-strong'];

/** A short top-of-the-list sample. The full breach check uses HIBP instead. */
const COMMON_PASSWORDS = [
    '123456',
    'password',
    '12345678',
    'qwerty',
    '123456789',
    '12345',
    '1234',
    '111111',
    '1234567',
    'dragon',
    '123123',
    'baseball',
    'abc123',
    'football',
    'monkey',
    'letmein',
    'shadow',
    'master',
    '666666',
    'qwertyuiop',
    '123321',
    'mustang',
    '1234567890',
    'michael',
    '654321',
    'superman',
    '1qaz2wsx',
    '7777777',
    '121212',
    '000000',
    'qazwsx',
    '123qwe',
    'killer',
    'trustno1',
    'jordan',
    'jennifer',
    'zxcvbnm',
    'asdfgh',
    'hunter',
    'buster',
    'soccer',
    'harley',
    'batman',
    'andrew',
    'tigger',
    'sunshine',
    'iloveyou',
    'charlie',
    'robert',
    'thomas',
    'hockey',
    'ranger',
    'daniel',
    'starwars',
    'klaster',
    '112233',
    'george',
    'computer',
    'michelle',
    'jessica',
    'pepper',
    '1111',
    'zxcvbn',
    '555555',
    '11111111',
    '131313',
    'freedom',
    '777777',
    'pass',
    'maggie',
    '159753',
    'aaaaaa',
    'ginger',
    'princess',
    'joshua',
    'cheese',
    'amanda',
    'summer',
    'love',
    'ashley',
    '6969',
    'nicole',
    'chelsea',
    'biteme',
    'matthew',
    'access',
    'yankees',
    '987654321',
    'dallas',
    'austin',
    'thunder',
    'taylor',
    'matrix',
    'admin',
    'welcome',
    'login',
    'passw0rd',
    'hello',
    'whatever',
    'qwerty123',
];

const COMMON_INDEX = new Map(COMMON_PASSWORDS.map((password, index) => [password, index + 1]));

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

/** Guesses per second. Online = a throttled login form; offline = a fast hash on a GPU rig. */
const ONLINE_RATE = 100;
const OFFLINE_RATE = 10_000_000_000;

function characterPool(password: string): number {
    let pool = 0;

    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/[0-9]/.test(password)) pool += 10;
    if (/[^A-Za-z0-9]/.test(password)) pool += 33;
    if (/[^\x20-\x7E]/.test(password)) pool += 100;

    return Math.max(pool, 1);
}

function classCount(password: string): number {
    return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
}

function repeatedRunChars(password: string): number {
    let count = 0;

    for (let i = 1; i < password.length; i++) {
        if (password[i] === password[i - 1]) {
            count++;
        }
    }

    return count;
}

function sequentialChars(password: string): number {
    const lower = password.toLowerCase();
    let count = 0;

    for (let i = 0; i + 2 < lower.length; i++) {
        const a = lower.charCodeAt(i);
        const b = lower.charCodeAt(i + 1);
        const c = lower.charCodeAt(i + 2);

        if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
            count++;
        }
    }

    for (const row of KEYBOARD_ROWS) {
        for (let i = 0; i + 2 < lower.length; i++) {
            if (row.includes(lower.slice(i, i + 3))) {
                count++;
            }
        }
    }

    return count;
}

function repeatedBlock(password: string): string | null {
    if (password.length > 64) {
        return null;
    }

    const match = password.match(/^(.+?)\1+$/);

    return match && match[1].length < password.length ? match[1] : null;
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return 'practically forever';
    }

    if (seconds < 1) {
        return 'instantly';
    }

    const units: [string, number][] = [
        ['year', 60 * 60 * 24 * 365.25],
        ['month', 60 * 60 * 24 * 30.44],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
        ['second', 1],
    ];

    for (const [name, unitSeconds] of units) {
        if (seconds >= unitSeconds) {
            const value = Math.floor(seconds / unitSeconds);

            if (value >= 1_000_000_000) {
                return `over a billion ${name}s`;
            }

            return `${value.toLocaleString()} ${name}${value === 1 ? '' : 's'}`;
        }
    }

    return 'instantly';
}

export function analyzePassword(password: string): PasswordAnalysis {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (password.length === 0) {
        return {
            score: 0,
            verdict: 'very-weak',
            entropy: 0,
            guesses: 0,
            pool: 0,
            onlineCrackTime: 'instantly',
            offlineCrackTime: 'instantly',
            warnings: [],
            suggestions: ['Type a password to see how it holds up.'],
        };
    }

    const classes = classCount(password);
    const pool = characterPool(password);
    const lower = password.toLowerCase();

    let entropy = password.length * Math.log2(pool);

    const repeated = repeatedRunChars(password);
    if (repeated > 0) {
        entropy -= repeated * Math.log2(pool) * 0.7;
        warnings.push('It repeats characters back to back.');
        suggestions.push('Avoid repeating the same character many times.');
    }

    const sequential = sequentialChars(password);
    if (sequential > 0) {
        entropy -= sequential * Math.log2(pool) * 0.5;
        warnings.push('It contains straight sequences such as "abc" or "1234".');
        suggestions.push('Avoid alphabet and keyboard sequences.');
    }

    const block = repeatedBlock(password);
    if (block !== null) {
        entropy = Math.min(entropy, block.length * Math.log2(pool));
        warnings.push('The whole password is a short block repeated.');
        suggestions.push('Avoid passwords built from one repeated chunk.');
    }

    if (/(19|20)\d{2}/.test(password) || /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/.test(password)) {
        entropy -= 10;
        warnings.push('It looks like it contains a date or a year.');
        suggestions.push('Avoid birthdays and years that are easy to guess.');
    }

    if (classes <= 1) {
        entropy *= 0.75;
    } else if (classes === 2 && password.length < 10) {
        entropy *= 0.9;
    }

    const commonRank = COMMON_INDEX.get(lower);
    const isCommon = commonRank !== undefined;
    if (isCommon) {
        entropy = Math.min(entropy, Math.log2(commonRank + 1) + 2);
        warnings.push('It is a commonly used password and would be guessed almost immediately.');
        suggestions.push('Choose something unique that is not on any common-password list.');
    }

    entropy = Math.max(1, entropy);

    let score: PasswordAnalysis['score'];

    if (isCommon || password.length < 6 || entropy < 28) {
        score = 0;
    } else if (entropy < 40) {
        score = 1;
    } else if (entropy < 60) {
        score = 2;
    } else if (entropy < 128) {
        score = 3;
    } else {
        score = 4;
    }

    if (password.length < 12) {
        suggestions.push('Length matters most: aim for 12-16 characters or a multi-word passphrase.');
    }
    if (!/[A-Z]/.test(password)) {
        suggestions.push('Add an uppercase letter.');
    }
    if (!/[0-9]/.test(password)) {
        suggestions.push('Add a number.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        suggestions.push('Add a symbol.');
    }

    const guesses = Math.pow(2, entropy);

    return {
        score,
        verdict: VERDICTS[score],
        entropy,
        guesses,
        pool,
        onlineCrackTime: formatDuration(guesses / (2 * ONLINE_RATE)),
        offlineCrackTime: formatDuration(guesses / (2 * OFFLINE_RATE)),
        warnings,
        suggestions: [...new Set(suggestions)],
    };
}

/**
 * Check a password against Have I Been Pwned using its k-anonymity range API.
 * Only the first five characters of the SHA-1 hash leave the browser, so the
 * password itself is never transmitted.
 *
 * @returns the breach count, or null when the check could not be completed.
 */
export async function checkBreaches(password: string, signal?: AbortSignal): Promise<number | null> {
    if (password.length < 4 || typeof crypto === 'undefined' || !crypto.subtle) {
        return null;
    }

    try {
        const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
        const hash = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();

        const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, { signal });

        if (!response.ok) {
            return null;
        }

        const suffix = hash.slice(5);
        const body = await response.text();

        for (const line of body.split('\n')) {
            const [candidate, count] = line.trim().split(':');

            if (candidate === suffix) {
                return Number.parseInt(count ?? '0', 10) || 0;
            }
        }

        return 0;
    } catch {
        return null;
    }
}
