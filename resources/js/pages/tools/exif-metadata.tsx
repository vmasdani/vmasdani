import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { downloadBlob } from '@/lib/download';
import { EXIF_IMAGE_ACCEPT, isJpeg, stripJpegMetadata, strippedFileName } from '@/lib/exif';
import { canvasToBlob, drawToCanvas, loadImageFromFile, validateImageFile } from '@/lib/image';
import { ShieldCheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

interface Tag {
    key: string;
    value: string;
}

export default function ExifMetadataTool() {
    const [file, setFile] = useState<File | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [hasGps, setHasGps] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inspect = async (candidate: File) => {
        const problem = validateImageFile(candidate);

        if (problem !== null) {
            setError(problem);
            setFile(null);
            setTags([]);

            return;
        }

        setError(null);
        setNote(null);
        setFile(candidate);
        setTags([]);
        setHasGps(false);
        setBusy(true);

        try {
            const exifr = await import('exifr');
            const parsed = await exifr.parse(candidate, true);

            if (!parsed || Object.keys(parsed).length === 0) {
                setNote('No readable metadata was found in this image.');
            } else {
                setHasGps(typeof parsed.latitude === 'number' || typeof parsed.longitude === 'number');
                setTags(
                    Object.entries(parsed)
                        .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) || value instanceof Date)
                        .map(([key, value]) => ({ key, value: value instanceof Date ? value.toLocaleString() : String(value) }))
                        .sort((a, b) => a.key.localeCompare(b.key)),
                );
            }
        } catch {
            setNote('Could not read metadata from this format in your browser.');
        } finally {
            setBusy(false);
        }
    };

    const strip = async () => {
        if (!file) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const buffer = await file.arrayBuffer();

            if (isJpeg(new Uint8Array(buffer))) {
                const stripped = stripJpegMetadata(new Uint8Array(buffer));

                downloadBlob(strippedFileName(file.name), new Blob([stripped], { type: 'image/jpeg' }));
            } else {
                const image = await loadImageFromFile(file);
                const canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight, file.type);
                const blob = await canvasToBlob(canvas, file.type, 0.92);
                const extension = file.name.split('.').pop() ?? 'png';

                downloadBlob(strippedFileName(file.name, extension), blob);
            }
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not strip the metadata.');
        } finally {
            setBusy(false);
        }
    };

    const lossless = file !== null && file.type === 'image/jpeg';

    return (
        <ToolPage slug="exif-metadata">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={EXIF_IMAGE_ACCEPT}
                            icon={<ShieldCheckIcon className="size-6" />}
                            label={file ? file.name : 'Drop a photo here or click to browse'}
                            hint="See what a photo reveals about you, then remove it before sharing."
                            onFiles={(files) => void inspect(files[0])}
                        />

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        {hasGps && (
                            <div className="border-destructive/40 text-destructive flex items-start gap-2 border p-3 text-sm">
                                <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                                This photo contains GPS coordinates that reveal where it was taken.
                            </div>
                        )}

                        {file && (
                            <div className="space-y-2">
                                <Button type="button" onClick={strip} disabled={busy}>
                                    {busy ? 'Working…' : 'Strip metadata & download'}
                                </Button>
                                <p className="text-muted-foreground text-xs">
                                    {lossless
                                        ? 'JPEG is stripped losslessly: the image data is copied byte-for-byte, only metadata segments are removed.'
                                        : 'This format is re-encoded in the browser, which also discards its metadata (quality may change slightly).'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        {tags.length > 0 ? (
                            <>
                                <p className="text-muted-foreground text-xs uppercase">{tags.length} tags</p>
                                <dl className="max-h-96 divide-y overflow-y-auto text-xs">
                                    {tags.map((tag) => (
                                        <div key={tag.key} className="grid grid-cols-[45%_1fr] gap-2 py-1.5">
                                            <dt className="text-muted-foreground truncate font-medium" title={tag.key}>
                                                {tag.key}
                                            </dt>
                                            <dd className="break-words">{tag.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </>
                        ) : (
                            <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed p-6 text-center text-xs">
                                <ShieldCheckIcon className="size-6" />
                                {note ?? (file ? 'No metadata found.' : 'Upload a photo to inspect its metadata.')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
