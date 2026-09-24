/**
 * Helpers for the Background Blur tool. It reuses the same on-device ISNet
 * model as the Background Remover: the cutout's alpha channel is the mask, so
 * blurring or recolouring the background needs no extra model.
 *
 * Pure helpers are node-testable; `compositeBackground` touches the canvas.
 */

export type BackgroundMode = 'blur' | 'color';

export const BACKGROUND_MODES: { value: BackgroundMode; label: string }[] = [
    { value: 'blur', label: 'Blur the background' },
    { value: 'color', label: 'Solid colour' },
];

export const MIN_BLUR_RADIUS = 0;
export const MAX_BLUR_RADIUS = 60;

export function clampBlurRadius(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(MIN_BLUR_RADIUS, Math.min(MAX_BLUR_RADIUS, Math.round(value)));
}

/**
 * Scale the blur radius to the image size so a phone photo and a thumbnail get
 * a visually similar effect. `strength` is 0-100; the longest side anchors it.
 */
export function blurRadiusForStrength(strength: number, longestSide: number): number {
    const clampedStrength = Math.max(0, Math.min(100, strength));

    return clampBlurRadius((longestSide / 100) * (clampedStrength / 10));
}

export function backgroundColorFileName(originalName: string, mode: BackgroundMode): string {
    const base = originalName.replace(/\.[^/.]+$/, '') || 'image';

    return `${base}-${mode === 'blur' ? 'blurred' : 'recoloured'}-background.png`;
}

export interface CompositeOptions {
    mode: BackgroundMode;
    /** Blur radius in pixels (only used for blur mode). */
    radius?: number;
    /** CSS colour (only used for color mode). */
    color?: string;
}

/**
 * Draw the cutout over a blurred or solid-colour background. Browser-only.
 * `original` is the full photo, `cutout` is the transparent-background PNG.
 */
export function compositeBackground(
    original: HTMLImageElement,
    cutout: HTMLImageElement,
    width: number,
    height: number,
    { mode, radius = 20, color = '#ffffff' }: CompositeOptions,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (context === null) {
        throw new Error('Canvas is unavailable in this browser.');
    }

    if (mode === 'blur') {
        context.filter = `blur(${clampBlurRadius(radius)}px)`;
        context.drawImage(original, 0, 0, width, height);
        context.filter = 'none';
    } else {
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
    }

    context.drawImage(cutout, 0, 0, width, height);

    return canvas;
}
