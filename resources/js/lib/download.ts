/**
 * Browser-only download helpers. These touch the DOM, so they are never
 * imported by the node-tested pure modules; pages call them directly.
 */

/** Trigger a download for an existing URL (object URL or data URL). */
export function triggerDownload(filename: string, href: string): void {
    const anchor = document.createElement('a');

    anchor.href = href;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

/** Trigger a download for a Blob, revoking the temporary object URL. */
export function downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);

    triggerDownload(filename, url);
    URL.revokeObjectURL(url);
}
