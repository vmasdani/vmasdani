import { extractPages, imagesToPdf, mergePdfs, parsePageRanges, pdfPageCount, rotatePages, splitPages } from '@/lib/pdf';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

const PNG_1X1 = Uint8Array.from(
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
);

const JPEG_1X1 = Uint8Array.from(
    Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
        'base64',
    ),
);

async function makePdf(pageSizes: [number, number][]): Promise<Uint8Array> {
    const document = await PDFDocument.create();

    pageSizes.forEach(([width, height]) => document.addPage([width, height]));

    return document.save();
}

describe('pdfPageCount', () => {
    it('reports the number of pages', async () => {
        expect(
            await pdfPageCount(
                await makePdf([
                    [100, 100],
                    [100, 100],
                    [100, 100],
                ]),
            ),
        ).toBe(3);
    });
});

describe('mergePdfs', () => {
    it('concatenates documents in order', async () => {
        const merged = await mergePdfs([
            await makePdf([
                [100, 100],
                [110, 110],
            ]),
            await makePdf([[200, 200]]),
        ]);
        const document = await PDFDocument.load(merged);

        expect(document.getPageCount()).toBe(3);
        expect(document.getPage(0).getWidth()).toBe(100);
        expect(document.getPage(1).getWidth()).toBe(110);
        expect(document.getPage(2).getWidth()).toBe(200);
    });

    it('rejects an empty list', async () => {
        await expect(mergePdfs([])).rejects.toThrow(/at least one/);
    });
});

describe('extractPages', () => {
    it('keeps only the requested pages, in the given order', async () => {
        const source = await makePdf([
            [100, 100],
            [200, 200],
            [300, 300],
        ]);
        const document = await PDFDocument.load(await extractPages(source, [2, 0]));

        expect(document.getPageCount()).toBe(2);
        expect(document.getPage(0).getWidth()).toBe(300);
        expect(document.getPage(1).getWidth()).toBe(100);
    });
});

describe('splitPages', () => {
    it('returns one single-page PDF per page', async () => {
        const parts = await splitPages(
            await makePdf([
                [100, 100],
                [200, 200],
            ]),
        );

        expect(parts).toHaveLength(2);
        expect(await pdfPageCount(parts[0])).toBe(1);
        expect(await pdfPageCount(parts[1])).toBe(1);
    });
});

describe('rotatePages', () => {
    it('applies a per-page rotation delta', async () => {
        const source = await makePdf([
            [100, 100],
            [100, 100],
        ]);
        const document = await PDFDocument.load(await rotatePages(source, [90, 0]));

        expect(document.getPage(0).getRotation().angle).toBe(90);
        expect(document.getPage(1).getRotation().angle).toBe(0);
    });
});

describe('parsePageRanges', () => {
    it('selects every page for blank input', () => {
        expect(parsePageRanges('', 3)).toEqual([0, 1, 2]);
        expect(parsePageRanges('   ', 2)).toEqual([0, 1]);
    });

    it('parses ranges, reversed ranges and single pages', () => {
        expect(parsePageRanges('1-3,5', 5)).toEqual([0, 1, 2, 4]);
        expect(parsePageRanges('3-1', 3)).toEqual([2, 1, 0]);
        expect(parsePageRanges('2', 3)).toEqual([1]);
    });

    it('deduplicates overlapping ranges', () => {
        expect(parsePageRanges('1-2,2-3', 3)).toEqual([0, 1, 2]);
    });

    it('rejects out-of-bounds and malformed input', () => {
        expect(() => parsePageRanges('0', 3)).toThrow(/between 1 and 3/);
        expect(() => parsePageRanges('4', 3)).toThrow(/between 1 and 3/);
        expect(() => parsePageRanges('a-b', 3)).toThrow(/not a valid/);
    });
});

describe('imagesToPdf', () => {
    it('creates one page per image, sized to fit by default', async () => {
        const bytes = await imagesToPdf([
            { bytes: PNG_1X1, kind: 'png' },
            { bytes: JPEG_1X1, kind: 'jpg' },
        ]);
        const document = await PDFDocument.load(bytes);

        expect(document.getPageCount()).toBe(2);
        expect(document.getPage(0).getWidth()).toBe(1);
    });

    it('lays an image onto a fixed page size', async () => {
        const bytes = await imagesToPdf([{ bytes: PNG_1X1, kind: 'png' }], { pageSize: 'a4', orientation: 'landscape' });
        const document = await PDFDocument.load(bytes);
        const page = document.getPage(0);

        expect(Math.round(page.getWidth())).toBe(842);
        expect(Math.round(page.getHeight())).toBe(595);
    });

    it('rejects an empty list', async () => {
        await expect(imagesToPdf([])).rejects.toThrow(/at least one/);
    });
});
