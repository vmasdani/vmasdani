/**
 * Shared helpers for the browser image tools (compressor, converter). The pure
 * functions (validation, sizing, naming) are node-testable; loading, drawing
 * and encoding touch the DOM and are only called from pages.
 */

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/bmp'];

export const IMAGE_ACCEPT = SUPPORTED_IMAGE_TYPES.join(',');

export interface ImageSize {
    width: number;
    height: number;
}

export interface ImageFormatOption {
    value: string;
    label: string;
    extension: string;
    /** Whether the format uses a quality setting. */
    lossy: boolean;
}

export const IMAGE_FORMATS: ImageFormatOption[] = [
    { value: 'image/jpeg', label: 'JPEG', extension: 'jpg', lossy: true },
    { value: 'image/webp', label: 'WebP', extension: 'webp', lossy: true },
    { value: 'image/avif', label: 'AVIF', extension: 'avif', lossy: true },
    { value: 'image/png', label: 'PNG', extension: 'png', lossy: false },
];

export function imageFormat(mime: string): ImageFormatOption {
    return IMAGE_FORMATS.find((format) => format.value === mime) ?? IMAGE_FORMATS[0];
}

export function isSupportedImageType(type: string): boolean {
    return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type.toLowerCase());
}

/** Validate a picked file, returning an error message or null when usable. */
export function validateImageFile(file: { type: string; size: number }): string | null {
    if (!isSupportedImageType(file.type)) {
        return 'That file type is not supported. Use a PNG, JPEG, WebP, AVIF, GIF or BMP image.';
    }

    if (file.size > MAX_IMAGE_BYTES) {
        return `That image is larger than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB. Please use a smaller one.`;
    }

    return null;
}

/**
 * Scale a size to fit inside a bounding box, preserving aspect ratio and never
 * enlarging. A max of 0 (or negative) means "no limit" on that axis.
 */
export function fitDimensions(width: number, height: number, maxWidth: number, maxHeight: number): ImageSize {
    if (width <= 0 || height <= 0) {
        return { width: 0, height: 0 };
    }

    const limitWidth = maxWidth > 0 ? maxWidth : width;
    const limitHeight = maxHeight > 0 ? maxHeight : height;
    const scale = Math.min(1, limitWidth / width, limitHeight / height);

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

/** Output filename like `photo-min.jpg`, using the format's extension. */
export function outputImageName(originalName: string, suffix: string, mime: string): string {
    const base = originalName.replace(/\.[^/.]+$/, '') || 'image';

    return `${base}${suffix}.${imageFormat(mime).extension}`;
}

/** Load a File into an <img>. Browser-only. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that image.'));
        };
        image.src = url;
    });
}

/** Load a Blob (e.g. a model output) into an <img>. Browser-only. */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load that image.'));
        };
        image.src = url;
    });
}

/**
 * Draw an image onto a canvas at the requested size. JPEG has no alpha, so the
 * canvas is pre-filled white to avoid black transparency. Browser-only.
 */
export function drawToCanvas(image: HTMLImageElement, width: number, height: number, mime: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (context === null) {
        throw new Error('Canvas is unavailable in this browser.');
    }

    if (mime === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    return canvas;
}

/** Encode a canvas to a Blob. Browser-only. */
export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error(`This browser cannot encode ${imageFormat(mime).label}.`));
                }
            },
            mime,
            quality,
        );
    });
}

/** Whether the browser can encode a MIME type (AVIF is not universal). Browser-only. */
export function supportsMimeType(mime: string): boolean {
    const canvas = document.createElement('canvas');

    canvas.width = 1;
    canvas.height = 1;

    return canvas.toDataURL(mime).startsWith(`data:${mime}`);
}

export interface PdfImageBytes {
    bytes: Uint8Array;
    kind: 'png' | 'jpg';
}

/**
 * Normalise an image file into bytes pdf-lib can embed. PNG and JPEG pass
 * through untouched; other formats are re-encoded to PNG via canvas. Browser-only.
 */
export async function fileToPdfImage(file: File): Promise<PdfImageBytes> {
    if (file.type === 'image/png') {
        return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'png' };
    }

    if (file.type === 'image/jpeg') {
        return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'jpg' };
    }

    const image = await loadImageFromFile(file);
    const canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight, 'image/png');
    const blob = await canvasToBlob(canvas, 'image/png');

    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'png' };
}

export interface RegionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Clamp a region to the image bounds so redaction stays in range. */
export function clampRegion(box: RegionBox, imageWidth: number, imageHeight: number): RegionBox {
    const x = Math.max(0, Math.min(box.x, imageWidth));
    const y = Math.max(0, Math.min(box.y, imageHeight));
    const right = Math.max(0, Math.min(box.x + box.width, imageWidth));
    const bottom = Math.max(0, Math.min(box.y + box.height, imageHeight));

    return { x, y, width: right - x, height: bottom - y };
}

/**
 * Redact a region on a canvas by blurring, pixelating or covering it in black.
 * Browser-only. Shared by the face-blur and license-plate tools.
 */
export function obfuscateRegion(
    context: CanvasRenderingContext2D,
    box: RegionBox,
    imageWidth: number,
    imageHeight: number,
    mode: 'blur' | 'pixelate' | 'solid',
): void {
    const { x, y, width, height } = clampRegion(box, imageWidth, imageHeight);

    if (width < 1 || height < 1) {
        return;
    }

    if (mode === 'solid') {
        context.fillStyle = '#000000';
        context.fillRect(x, y, width, height);

        return;
    }

    if (mode === 'pixelate') {
        const cell = Math.max(4, Math.round(Math.max(width, height) / 12));
        const small = document.createElement('canvas');

        small.width = Math.max(1, Math.round(width / cell));
        small.height = Math.max(1, Math.round(height / cell));

        const smallContext = small.getContext('2d');

        if (smallContext === null) {
            return;
        }

        smallContext.drawImage(context.canvas, x, y, width, height, 0, 0, small.width, small.height);
        context.imageSmoothingEnabled = false;
        context.drawImage(small, 0, 0, small.width, small.height, x, y, width, height);
        context.imageSmoothingEnabled = true;

        return;
    }

    const radius = Math.max(6, Math.round(Math.max(width, height) / 8));

    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.filter = `blur(${radius}px)`;
    context.drawImage(context.canvas, 0, 0);
    context.restore();
}
