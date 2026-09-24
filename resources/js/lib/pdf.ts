/**
 * PDF operations built on pdf-lib. pdf-lib is pure JavaScript and runs in both
 * the browser and Node, so these functions are unit-tested directly and the
 * tools stay fully client-side.
 */

import { PDFDocument, degrees } from 'pdf-lib';

export type PdfSource = Uint8Array | ArrayBuffer;

export async function pdfPageCount(source: PdfSource): Promise<number> {
    const document = await PDFDocument.load(source);

    return document.getPageCount();
}

/** Concatenate PDFs in the given order. */
export async function mergePdfs(sources: PdfSource[]): Promise<Uint8Array> {
    if (sources.length === 0) {
        throw new Error('Add at least one PDF.');
    }

    const merged = await PDFDocument.create();

    for (const source of sources) {
        const document = await PDFDocument.load(source);
        const pages = await merged.copyPages(document, document.getPageIndices());

        pages.forEach((page) => merged.addPage(page));
    }

    return merged.save();
}

/** Build a new PDF from an explicit, ordered list of zero-based page indices. */
export async function extractPages(source: PdfSource, indices: number[]): Promise<Uint8Array> {
    if (indices.length === 0) {
        throw new Error('Select at least one page.');
    }

    const document = await PDFDocument.load(source);
    const result = await PDFDocument.create();
    const pages = await result.copyPages(document, indices);

    pages.forEach((page) => result.addPage(page));

    return result.save();
}

/** Split a PDF into one single-page PDF per page, in order. */
export async function splitPages(source: PdfSource): Promise<Uint8Array[]> {
    const document = await PDFDocument.load(source);
    const output: Uint8Array[] = [];

    for (const index of document.getPageIndices()) {
        output.push(await extractPages(source, [index]));
    }

    return output;
}

/**
 * Rotate pages by a per-page delta (degrees clockwise, multiples of 90). A
 * missing or zero entry leaves the page as-is. Rotation is additive so it
 * composes with any rotation already in the file.
 */
export async function rotatePages(source: PdfSource, rotations: number[]): Promise<Uint8Array> {
    const document = await PDFDocument.load(source);

    document.getPages().forEach((page, index) => {
        const delta = rotations[index] ?? 0;

        if (delta !== 0) {
            page.setRotation(degrees((((page.getRotation().angle + delta) % 360) + 360) % 360));
        }
    });

    return document.save();
}

/**
 * Parse a page-range string like "1-3,5,8-6" into ordered, deduplicated
 * zero-based indices. Blank input selects every page. Clamps nothing: an
 * out-of-bounds page is an error so typos are not silently ignored.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
    const trimmed = input.trim();

    if (trimmed === '') {
        return Array.from({ length: pageCount }, (_, index) => index);
    }

    const result: number[] = [];
    const seen = new Set<number>();

    for (const part of trimmed.split(',')) {
        const token = part.trim();

        if (token === '') {
            continue;
        }

        const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(token);

        if (match === null) {
            throw new Error(`"${token}" is not a valid page or range. Use numbers like 1-3,5.`);
        }

        const start = Number(match[1]);
        const end = match[2] === undefined ? start : Number(match[2]);

        if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
            throw new Error(`Page numbers must be between 1 and ${pageCount}.`);
        }

        const step = start <= end ? 1 : -1;

        for (let page = start; step === 1 ? page <= end : page >= end; page += step) {
            const index = page - 1;

            if (!seen.has(index)) {
                seen.add(index);
                result.push(index);
            }
        }
    }

    if (result.length === 0) {
        throw new Error('Select at least one page.');
    }

    return result;
}

export type PdfImageKind = 'jpg' | 'png';

export interface PdfImageInput {
    bytes: Uint8Array;
    kind: PdfImageKind;
}

export type PdfPageSize = 'fit' | 'a4' | 'letter';

export interface ImagesToPdfOptions {
    pageSize?: PdfPageSize;
    orientation?: 'portrait' | 'landscape';
    /** Margin in points around the image. */
    margin?: number;
}

/** Page dimensions in PDF points (1/72 inch). */
const PAGE_SIZES: Record<'a4' | 'letter', [number, number]> = {
    a4: [595.28, 841.89],
    letter: [612, 792],
};

/** Lay images onto pages of a PDF, one image per page, centred and scaled to fit. */
export async function imagesToPdf(images: PdfImageInput[], options: ImagesToPdfOptions = {}): Promise<Uint8Array> {
    if (images.length === 0) {
        throw new Error('Add at least one image.');
    }

    const { pageSize = 'fit', orientation = 'portrait', margin = 0 } = options;
    const document = await PDFDocument.create();

    for (const image of images) {
        const embedded = image.kind === 'png' ? await document.embedPng(image.bytes) : await document.embedJpg(image.bytes);

        let width: number;
        let height: number;

        if (pageSize === 'fit') {
            width = embedded.width + margin * 2;
            height = embedded.height + margin * 2;
        } else {
            const [short, long] = PAGE_SIZES[pageSize];
            const portrait = orientation === 'portrait';

            width = portrait ? short : long;
            height = portrait ? long : short;
        }

        const page = document.addPage([width, height]);
        const availableWidth = Math.max(1, width - margin * 2);
        const availableHeight = Math.max(1, height - margin * 2);
        const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;

        page.drawImage(embedded, {
            x: (width - drawWidth) / 2,
            y: (height - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
        });
    }

    return document.save();
}
