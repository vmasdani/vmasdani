import qrcode from 'qrcode-generator';

/**
 * QR rendering built on qrcode-generator, which is pure JavaScript: it builds
 * the module matrix without a canvas, so the same code runs in the browser and
 * in the Vitest node environment. We render our own SVG (instead of the
 * library's helper) to allow custom colours.
 */

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export const QR_ERROR_LEVELS: { value: QrErrorCorrection; label: string }[] = [
    { value: 'L', label: 'Low (~7%)' },
    { value: 'M', label: 'Medium (~15%)' },
    { value: 'Q', label: 'Quartile (~25%)' },
    { value: 'H', label: 'High (~30%)' },
];

export interface QrOptions {
    text: string;
    errorCorrection?: QrErrorCorrection;
    /** Quiet zone, in modules. */
    margin?: number;
    dark?: string;
    light?: string;
}

export function createQr(text: string, errorCorrection: QrErrorCorrection = 'M') {
    if (text === '') {
        throw new Error('Enter something to encode.');
    }

    const qr = qrcode(0, errorCorrection);
    qr.addData(text);

    try {
        qr.make();
    } catch {
        throw new Error('That is too much data for a QR code. Shorten it or lower the error correction level.');
    }

    return qr;
}

export function qrModuleCount(text: string, errorCorrection: QrErrorCorrection = 'M'): number {
    return createQr(text, errorCorrection).getModuleCount();
}

export function qrSvg({ text, errorCorrection = 'M', margin = 4, dark = '#000000', light = '#ffffff' }: QrOptions): string {
    const qr = createQr(text, errorCorrection);
    const count = qr.getModuleCount();
    const size = count + margin * 2;

    let path = '';

    for (let row = 0; row < count; row++) {
        for (let column = 0; column < count; column++) {
            if (qr.isDark(row, column)) {
                path += `M${column + margin} ${row + margin}h1v1h-1z`;
            }
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img"><rect width="${size}" height="${size}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

/**
 * Rasterise the matrix to a PNG data URL. Browser-only (needs <canvas>).
 */
export function qrPngDataUrl(options: QrOptions, pixelSize = 1024): string {
    const { text, errorCorrection = 'M', margin = 4, dark = '#000000', light = '#ffffff' } = options;
    const qr = createQr(text, errorCorrection);
    const count = qr.getModuleCount();
    const total = count + margin * 2;
    const cell = Math.max(1, Math.floor(pixelSize / total));
    const size = cell * total;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');

    if (context === null) {
        throw new Error('Canvas is unavailable in this browser.');
    }

    context.fillStyle = light;
    context.fillRect(0, 0, size, size);
    context.fillStyle = dark;

    for (let row = 0; row < count; row++) {
        for (let column = 0; column < count; column++) {
            if (qr.isDark(row, column)) {
                context.fillRect((column + margin) * cell, (row + margin) * cell, cell, cell);
            }
        }
    }

    return canvas.toDataURL('image/png');
}
