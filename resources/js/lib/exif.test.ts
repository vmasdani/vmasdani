import { isJpeg, stripJpegMetadata, strippedFileName } from '@/lib/exif';
import { describe, expect, it } from 'vitest';

function segment(marker: number, payload: number[]): number[] {
    const length = payload.length + 2;

    return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

function bytes(...parts: number[][]): Uint8Array {
    return Uint8Array.from(parts.flat());
}

function contains(haystack: Uint8Array, needle: number[]): boolean {
    outer: for (let start = 0; start + needle.length <= haystack.length; start++) {
        for (let index = 0; index < needle.length; index++) {
            if (haystack[start + index] !== needle[index]) {
                continue outer;
            }
        }

        return true;
    }

    return false;
}

const SOI = [0xff, 0xd8];
const SOS = [0xff, 0xda, 0x00, 0x04, 0x01, 0x02];
const ENTROPY = [0x12, 0x34, 0x56];

const sample = bytes(
    SOI,
    segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
    segment(0xe1, [0x45, 0x78, 0x69, 0x66]),
    segment(0xe2, [0x49, 0x43, 0x43]),
    segment(0xfe, [0x68, 0x69]),
    SOS,
    ENTROPY,
);

describe('isJpeg', () => {
    it('detects the SOI marker', () => {
        expect(isJpeg(Uint8Array.from(SOI))).toBe(true);
        expect(isJpeg(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    });
});

describe('stripJpegMetadata', () => {
    it('removes APP1, APP13 and comment segments', () => {
        const stripped = stripJpegMetadata(sample);

        expect(contains(stripped, [0xff, 0xe1])).toBe(false);
        expect(contains(stripped, [0xff, 0xed])).toBe(false);
        expect(contains(stripped, [0xff, 0xfe])).toBe(false);
    });

    it('keeps the JFIF, ICC and image data segments', () => {
        const stripped = stripJpegMetadata(sample);

        expect(contains(stripped, [0xff, 0xe0])).toBe(true);
        expect(contains(stripped, [0xff, 0xe2])).toBe(true);
        expect(contains(stripped, [0xff, 0xda])).toBe(true);
        expect(contains(stripped, ENTROPY)).toBe(true);
        expect(stripped[0]).toBe(0xff);
        expect(stripped[1]).toBe(0xd8);
    });

    it('rejects non-JPEG input', () => {
        expect(() => stripJpegMetadata(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toThrow(/JPEG/);
    });
});

describe('strippedFileName', () => {
    it('suffixes the original name', () => {
        expect(strippedFileName('holiday.jpeg')).toBe('holiday-no-exif.jpg');
        expect(strippedFileName('holiday.png', 'png')).toBe('holiday-no-exif.png');
    });
});
