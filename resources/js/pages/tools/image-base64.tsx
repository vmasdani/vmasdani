import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { dataUrlToBlob, extensionForMime, isImageDataUrl, parseDataUrl } from '@/lib/data-url';
import { downloadBlob, triggerDownload } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { DownloadSimpleIcon, FileImageIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp,image/svg+xml';
const MAX_BYTES = 10 * 1024 * 1024;

export default function ImageBase64Tool() {
    const [dataUrl, setDataUrl] = useState('');
    const [sourceName, setSourceName] = useState('image');
    const [sourceSize, setSourceSize] = useState(0);
    const [encodeError, setEncodeError] = useState<string | null>(null);

    const [encoded, setEncoded] = useState('');
    const [decoded, setDecoded] = useState<{ url: string; mime: string } | null>(null);
    const [decodeError, setDecodeError] = useState<string | null>(null);
    const previousUrl = useRef<string | null>(null);

    const encodeFile = (file: File) => {
        setEncodeError(null);

        if (!file.type.startsWith('image/')) {
            setDataUrl('');
            setEncodeError('That file is not an image.');

            return;
        }

        if (file.size > MAX_BYTES) {
            setDataUrl('');
            setEncodeError(`That image is larger than ${formatBytes(MAX_BYTES)}.`);

            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setDataUrl(typeof reader.result === 'string' ? reader.result : '');
            setSourceName(file.name);
            setSourceSize(file.size);
        };
        reader.onerror = () => setEncodeError('Could not read that file.');
        reader.readAsDataURL(file);
    };

    const decodeInput = (value: string) => {
        setEncoded(value);
        setDecodeError(null);
        setDecoded(null);

        if (value.trim() === '') {
            return;
        }

        try {
            parseDataUrl(value);
        } catch (exception) {
            setDecodeError(exception instanceof Error ? exception.message : 'That data URL is not valid.');

            return;
        }

        try {
            const { mime } = parseDataUrl(value);
            const blob = dataUrlToBlob(value);

            if (previousUrl.current) {
                URL.revokeObjectURL(previousUrl.current);
            }

            previousUrl.current = URL.createObjectURL(blob);
            setDecoded({ url: previousUrl.current, mime });
        } catch (exception) {
            setDecodeError(exception instanceof Error ? exception.message : 'Could not decode that data URL.');
        }
    };

    const downloadEncodedText = () => {
        triggerDownload(
            `${sourceName.replace(/\.[^/.]+$/, '') || 'image'}-base64.txt`,
            `data:text/plain;charset=utf-8,${encodeURIComponent(dataUrl)}`,
        );
    };

    const downloadDecoded = () => {
        if (!decoded) {
            return;
        }

        downloadBlob(`decoded.${extensionForMime(decoded.mime)}`, dataUrlToBlob(encoded));
    };

    return (
        <ToolPage slug="image-base64">
            <Tabs defaultValue="encode">
                <TabsList>
                    <TabsTrigger value="encode">Image → Base64</TabsTrigger>
                    <TabsTrigger value="decode">Base64 → Image</TabsTrigger>
                </TabsList>

                <TabsContent value="encode" className="pt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardContent className="space-y-4">
                                <FileDrop
                                    accept={ACCEPTED}
                                    icon={<FileImageIcon className="size-6" />}
                                    label="Drop an image here or click to browse"
                                    hint={`PNG, JPEG, WebP, AVIF, GIF, BMP or SVG up to ${formatBytes(MAX_BYTES)}.`}
                                    onFiles={(files) => encodeFile(files[0])}
                                />
                                {encodeError && <p className="text-destructive text-sm">{encodeError}</p>}
                                {dataUrl && (
                                    <p className="text-muted-foreground text-xs">
                                        {sourceName} · {formatBytes(sourceSize)} · {formatBytes(dataUrl.length)} as text
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="ib64-output">Data URL</Label>
                                    <CopyButton value={dataUrl} label="Copy" />
                                </div>
                                <Textarea
                                    id="ib64-output"
                                    readOnly
                                    value={dataUrl}
                                    placeholder="The Base64 data URL appears here."
                                    className="min-h-48 font-mono text-xs break-all"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={downloadEncodedText} disabled={dataUrl === ''}>
                                    <DownloadSimpleIcon />
                                    Download as .txt
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="decode" className="pt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardContent className="space-y-3">
                                <Label htmlFor="ib64-input">Paste a Base64 data URL</Label>
                                <Textarea
                                    id="ib64-input"
                                    value={encoded}
                                    spellCheck={false}
                                    onChange={(event) => decodeInput(event.target.value)}
                                    placeholder="data:image/png;base64,..."
                                    className="min-h-48 font-mono text-xs break-all"
                                />
                                {decodeError && <p className="text-destructive text-sm">{decodeError}</p>}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex flex-col items-center gap-4">
                                <div className="border-border flex min-h-48 w-full items-center justify-center overflow-hidden border border-dashed p-4">
                                    {decoded ? (
                                        <img src={decoded.url} alt="Decoded preview" className="max-h-56 max-w-full object-contain" />
                                    ) : (
                                        <span className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                                            <PlugsConnectedIcon className="size-6" />
                                            {isImageDataUrl(encoded) ? 'Preview unavailable.' : 'Paste a data URL to preview it.'}
                                        </span>
                                    )}
                                </div>
                                <Button type="button" variant="outline" onClick={downloadDecoded} disabled={!decoded} className="w-full">
                                    <DownloadSimpleIcon />
                                    Download image
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </ToolPage>
    );
}
