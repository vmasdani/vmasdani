/**
 * Conversions behind the Unix timestamp tool. Everything is pure so the
 * component only has to worry about formatting and input parsing.
 */

export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds';

/** Above this, a number is assumed to already be in milliseconds. */
const MILLISECOND_THRESHOLD = 1_000_000_000_000;

export function unixToDate(value: number, unit: TimestampUnit = 'auto'): Date {
    if (!Number.isFinite(value)) {
        throw new Error('Enter a numeric timestamp.');
    }

    let milliseconds: number;

    if (unit === 'seconds') {
        milliseconds = value * 1000;
    } else if (unit === 'milliseconds') {
        milliseconds = value;
    } else {
        milliseconds = Math.abs(value) >= MILLISECOND_THRESHOLD ? value : value * 1000;
    }

    const date = new Date(milliseconds);

    if (Number.isNaN(date.getTime())) {
        throw new Error('That timestamp is out of range.');
    }

    return date;
}

export function dateToTimestamps(date: Date): { seconds: number; milliseconds: number } {
    const milliseconds = date.getTime();

    return { seconds: Math.floor(milliseconds / 1000), milliseconds };
}

export function isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
}

/**
 * Parse a user-supplied value that may be a Unix timestamp or a date string.
 */
export function parseTimestampInput(input: string): Date | null {
    const trimmed = input.trim();

    if (trimmed === '') {
        return null;
    }

    if (/^-?\d+$/.test(trimmed)) {
        try {
            return unixToDate(Number(trimmed), 'auto');
        } catch {
            return null;
        }
    }

    const parsed = new Date(trimmed);

    return isValidDate(parsed) ? parsed : null;
}

export function nowTimestamps(): { seconds: number; milliseconds: number } {
    return dateToTimestamps(new Date());
}
