/**
 * Metadata handling for the EXIF tool. Reading the tags is done in the page
 * with exifr; the lossless strip is pure byte surgery over the JPEG marker
 * segments and is unit-tested here.
 *
 * JPEG is a stream of 0xFF marker segments. We keep the colour information
 * (APP0/JFIF, APP2/ICC) and the image data, and drop the segments that carry
 * personal metadata: APP1 (EXIF/XMP, where GPS lives) and APP13 (Photoshop)
 * plus comments. The compressed image data after the SOS marker is untouched,
 * so there is no re-encoding and no quality loss.
 */

export function isJpeg(bytes: Uint8Array): boolean {
    return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/** JPEG markers whose segments are removed when stripping metadata. */
const STRIPPED_MARKERS = new Set([
    0xe1, // APP1 - EXIF / XMP (GPS, camera, timestamps)
    0xed, // APP13 - Photoshop IRB
    0xfe, // COM - free-text comment
]);

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
    if (!isJpeg(bytes)) {
        throw new Error('Lossless stripping is only supported for JPEG images.');
    }

    const output: number[] = [0xff, 0xd8];
    let offset = 2;

    while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            break;
        }

        const marker = bytes[offset + 1];

        // Standalone markers (no length): TEM and RST0-7.
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            output.push(0xff, marker);
            offset += 2;

            continue;
        }

        // Start of scan: everything from here is compressed image data.
        if (marker === 0xda) {
            for (let index = offset; index < bytes.length; index++) {
                output.push(bytes[index]);
            }

            break;
        }

        if (offset + 3 >= bytes.length) {
            break;
        }

        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        const segmentEnd = offset + 2 + length;

        if (length < 2 || segmentEnd > bytes.length) {
            break;
        }

        if (!STRIPPED_MARKERS.has(marker)) {
            for (let index = offset; index < segmentEnd; index++) {
                output.push(bytes[index]);
            }
        }

        offset = segmentEnd;
    }

    return Uint8Array.from(output);
}

/** MIME types we can read EXIF from and/or strip. */
export const EXIF_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/tiff';

export function strippedFileName(originalName: string, extension = 'jpg'): string {
    const base = originalName.replace(/\.[^/.]+$/, '') || 'image';

    return `${base}-no-exif.${extension.replace(/^\./, '')}`;
}
