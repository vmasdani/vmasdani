/**
 * Helpers for the Background Remover tool. The actual inference runs in the
 * browser via @imgly/background-removal (dynamic import, onnxruntime-web), so
 * this module stays framework-free and browser-agnostic to keep the Vitest
 * node environment happy. It only knows about model metadata and config.
 */

export type BackgroundRemovalModel = 'isnet_fp16' | 'isnet_quint8';

export interface BackgroundRemovalModelOption {
    value: BackgroundRemovalModel;
    label: string;
    description: string;
    sizeLabel: string;
}

/**
 * Both models are ISNet variants. fp16 is the higher-quality default, quint8
 * is roughly half the download for slightly rougher edges.
 */
export const BACKGROUND_REMOVAL_MODELS: BackgroundRemovalModelOption[] = [
    {
        value: 'isnet_fp16',
        label: 'High quality',
        description: 'Best edges, larger one-time download.',
        sizeLabel: '~84 MB',
    },
    {
        value: 'isnet_quint8',
        label: 'Faster download',
        description: 'Quantised model, nearly as good, roughly half the size.',
        sizeLabel: '~42 MB',
    },
];

/** Where the model chunks and WASM runtime are served from. */
export const BACKGROUND_REMOVAL_PUBLIC_PATH = '/background-removal/';

/**
 * The library builds request URLs with `new URL(chunk, publicPath)`, which
 * requires an absolute base. Prefix the path with the page origin.
 */
export function backgroundRemovalPublicPath(origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${BACKGROUND_REMOVAL_PUBLIC_PATH}`;
}

/** Reject absurd uploads before the model has to crunch them. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/bmp'];

export function isSupportedImageType(type: string): boolean {
    return ALLOWED_TYPES.includes(type.toLowerCase());
}

/**
 * Validate a picked file. Returns an error message, or null when it can be
 * handed to the model.
 */
export function validateImageFile(file: { type: string; size: number }): string | null {
    if (!isSupportedImageType(file.type)) {
        return 'That file type is not supported. Use a PNG, JPEG, WebP, AVIF, GIF or BMP image.';
    }

    if (file.size > MAX_IMAGE_BYTES) {
        return `That image is larger than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB. Please use a smaller one.`;
    }

    return null;
}

export { formatBytes } from '@/lib/format';

/**
 * Build the config passed to removeBackground(). Purely a factory so the model
 * choice and the self-hosted asset path live in one place.
 */
export function backgroundRemovalConfig(
    model: BackgroundRemovalModel = 'isnet_fp16',
    origin?: string,
): {
    publicPath: string;
    model: BackgroundRemovalModel;
    device: 'cpu';
    output: { format: 'image/png' };
    progress?: (key: string, current: number, total: number) => void;
} {
    return {
        publicPath: backgroundRemovalPublicPath(origin),
        model,
        device: 'cpu',
        output: {
            format: 'image/png',
        },
    };
}

/** Strip the extension so the cutout reuses the original filename. */
export function resultFileName(originalName: string): string {
    const base = originalName.replace(/\.[^/.]+$/, '');

    return `${base || 'image'}-transparent.png`;
}
