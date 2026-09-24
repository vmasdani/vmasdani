/**
 * Face Blur helpers. Detection uses MediaPipe's BlazeFace task in the page; the
 * geometry helpers here are pure so they stay testable.
 */

export const FACE_MODEL_PATH = '/face-blur/blaze_face_short_range.tflite';
export const FACE_WASM_PATH = '/face-blur/wasm';

export type FaceBlurMode = 'blur' | 'pixelate' | 'solid';

export const FACE_BLUR_MODES: { value: FaceBlurMode; label: string }[] = [
    { value: 'blur', label: 'Blur' },
    { value: 'pixelate', label: 'Pixelate' },
    { value: 'solid', label: 'Black box' },
];

function absolute(path: string, origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${path}`;
}

export function faceModelUrl(origin?: string): string {
    return absolute(FACE_MODEL_PATH, origin);
}

export function faceWasmUrl(origin?: string): string {
    return absolute(FACE_WASM_PATH, origin);
}

export interface FaceBox {
    originX: number;
    originY: number;
    width: number;
    height: number;
}

/** MediaPipe reports a corner-based box; our region helper uses the same shape. */
export function faceBoxToRegion(box: FaceBox): { x: number; y: number; width: number; height: number } {
    return { x: box.originX, y: box.originY, width: box.width, height: box.height };
}

/**
 * Grow a box outward by a percentage, so the redaction covers a little more
 * than the exact face. Never shrinks.
 */
export function expandBox(
    box: { x: number; y: number; width: number; height: number },
    percent: number,
): { x: number; y: number; width: number; height: number } {
    const factor = Math.max(0, percent) / 100;
    const padX = box.width * factor;
    const padY = box.height * factor;

    return { x: box.x - padX, y: box.y - padY, width: box.width + padX * 2, height: box.height + padY * 2 };
}

export function faceResultFileName(originalName: string): string {
    const base = originalName.replace(/\.[^/.]+$/, '') || 'image';

    return `${base}-faces-blurred.png`;
}
