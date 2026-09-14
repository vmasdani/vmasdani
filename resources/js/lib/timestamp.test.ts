import { dateToTimestamps, isValidDate, nowTimestamps, parseTimestampInput, unixToDate } from '@/lib/timestamp';
import { describe, expect, it } from 'vitest';

describe('unixToDate', () => {
    it('treats explicit seconds and milliseconds correctly', () => {
        expect(unixToDate(0, 'seconds').getTime()).toBe(0);
        expect(unixToDate(1_700_000_000_000, 'milliseconds').getTime()).toBe(1_700_000_000_000);
    });

    it('auto-detects seconds vs milliseconds by magnitude', () => {
        expect(unixToDate(1_700_000_000, 'auto').getTime()).toBe(1_700_000_000_000);
        expect(unixToDate(1_700_000_000_000, 'auto').getTime()).toBe(1_700_000_000_000);
    });

    it('throws on a non-numeric or out-of-range value', () => {
        expect(() => unixToDate(Number.NaN)).toThrow(/numeric/);
        expect(() => unixToDate(1e30)).toThrow(/out of range/);
    });
});

describe('dateToTimestamps', () => {
    it('returns seconds and milliseconds', () => {
        const date = new Date('2023-11-14T22:13:20.000Z');

        expect(dateToTimestamps(date)).toEqual({ seconds: 1_700_000_000, milliseconds: 1_700_000_000_000 });
    });

    it('floors fractional seconds', () => {
        const date = new Date(1_500);

        expect(dateToTimestamps(date).seconds).toBe(1);
    });
});

describe('parseTimestampInput', () => {
    it('parses numeric timestamps', () => {
        expect(parseTimestampInput('1700000000')?.getTime()).toBe(1_700_000_000_000);
    });

    it('parses date strings', () => {
        expect(parseTimestampInput('2023-11-14T22:13:20Z')?.getTime()).toBe(1_700_000_000_000);
    });

    it('returns null for empty or invalid input', () => {
        expect(parseTimestampInput('')).toBeNull();
        expect(parseTimestampInput('not a date')).toBeNull();
    });
});

describe('nowTimestamps', () => {
    it('returns matching seconds and milliseconds', () => {
        const { seconds, milliseconds } = nowTimestamps();

        expect(Math.floor(milliseconds / 1000)).toBe(seconds);
    });
});

describe('isValidDate', () => {
    it('rejects invalid dates', () => {
        expect(isValidDate(new Date('nonsense'))).toBe(false);
        expect(isValidDate(new Date())).toBe(true);
    });
});
