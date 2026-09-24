/**
 * Small formatting helpers shared by the client-only tools. Kept pure and
 * dependency-free so they stay testable in the Vitest node environment.
 */

export function formatBytes(bytes: number): string {
    if (bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

    return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Strip the extension so a converted file reuses the original name. */
export function baseName(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '') || 'file';
}

/** Build an output filename like `photo-webp.webp` from an input and suffix. */
export function suffixedFileName(originalName: string, suffix: string, extension: string): string {
    const base = baseName(originalName);

    return `${base}${suffix}.${extension.replace(/^\./, '')}`;
}

/** Percentage saved from `original` down to `result`, clamped to [0, 100]. */
export function savedPercent(original: number, result: number): number {
    if (original <= 0 || result >= original) {
        return 0;
    }

    return Math.min(100, Math.round((1 - result / original) * 100));
}
