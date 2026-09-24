import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadBlob } from '@/lib/download';
import { formatBytes, savedPercent } from '@/lib/format';
import {
    IMAGE_ACCEPT,
    IMAGE_FORMATS,
    canvasToBlob,
    drawToCanvas,
    fitDimensions,
    imageFormat,
    loadImageFromFile,
    outputImageName,
    supportsMimeType,
    validateImageFile,
} from '@/lib/image';
import { DownloadSimpleIcon, ImageSquareIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

interface CompressedImage {
    name: string;
    originalSize: number;
    size: number;
    blob: Blob;
    url: string;
    width: number;
    height: number;
}

export default function ImageCompressorTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [format, setFormat] = useState('image/jpeg');
    const [quality, setQuality] = useState(80);
    const [maxWidth, setMaxWidth] = useState(1920);
    const [maxHeight, setMaxHeight] = useState(1920);
    const [results, setResults] = useState<CompressedImage[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const createdUrls = useRef<string[]>([]);

    const lossy = imageFormat(format).lossy;
    const formatSupported = typeof document !== 'undefined' ? supportsMimeType(format) : true;

    useEffect(() => {
        const urls = createdUrls;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const clearResults = () => {
        createdUrls.current.forEach((url) => URL.revokeObjectURL(url));
        createdUrls.current = [];
        setResults([]);
    };

    const acceptFiles = (picked: File[]) => {
        const problems = picked.map(validateImageFile).filter((problem): problem is string => problem !== null);

        if (problems.length > 0) {
            setError(problems[0]);
            setFiles([]);
            clearResults();

            return;
        }

        setError(null);
        setFiles(picked);
        clearResults();
    };

    const compress = async () => {
        if (files.length === 0) {
            return;
        }

        setBusy(true);
        setError(null);
        clearResults();

        const next: CompressedImage[] = [];

        try {
            for (const file of files) {
                const image = await loadImageFromFile(file);
                const size = fitDimensions(image.naturalWidth, image.naturalHeight, maxWidth, maxHeight);
                const canvas = drawToCanvas(image, size.width, size.height, format);
                const blob = await canvasToBlob(canvas, format, lossy ? quality / 100 : undefined);
                const url = URL.createObjectURL(blob);

                createdUrls.current.push(url);
                next.push({
                    name: outputImageName(file.name, '-compressed', format),
                    originalSize: file.size,
                    size: blob.size,
                    blob,
                    url,
                    width: size.width,
                    height: size.height,
                });
            }

            setResults(next);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not compress those images.');
        } finally {
            setBusy(false);
        }
    };

    const downloadAll = () => {
        results.forEach((result) => downloadBlob(result.name, result.blob));
    };

    const totalOriginal = results.reduce((sum, result) => sum + result.originalSize, 0);
    const totalResult = results.reduce((sum, result) => sum + result.size, 0);

    return (
        <ToolPage slug="image-compressor">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            multiple
                            icon={<ImageSquareIcon className="size-6" />}
                            label="Drop images here or click to browse"
                            hint="One or many. They are resized and re-encoded entirely in your browser."
                            onFiles={acceptFiles}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="ic-format">Output format</Label>
                                <Select
                                    value={format}
                                    onValueChange={(value) => {
                                        setFormat(value);
                                        clearResults();
                                    }}
                                >
                                    <SelectTrigger id="ic-format" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {IMAGE_FORMATS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!formatSupported && (
                                    <p className="text-destructive text-xs">Your browser cannot encode {imageFormat(format).label}.</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ic-quality">Quality {lossy ? `${quality}%` : '(lossless)'}</Label>
                                <Input
                                    id="ic-quality"
                                    type="range"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={quality}
                                    disabled={!lossy}
                                    onChange={(event) => setQuality(Number(event.target.value))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ic-width">Max width (px)</Label>
                                <Input
                                    id="ic-width"
                                    type="number"
                                    min={0}
                                    value={maxWidth}
                                    onChange={(event) => setMaxWidth(Number(event.target.value))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ic-height">Max height (px)</Label>
                                <Input
                                    id="ic-height"
                                    type="number"
                                    min={0}
                                    value={maxHeight}
                                    onChange={(event) => setMaxHeight(Number(event.target.value))}
                                />
                            </div>
                        </div>

                        <p className="text-muted-foreground text-xs">Leave a max dimension at 0 for no limit. Images are never enlarged.</p>

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={compress} disabled={files.length === 0 || busy || !formatSupported}>
                                {busy ? 'Compressing…' : `Compress ${files.length > 1 ? `${files.length} images` : 'image'}`}
                            </Button>
                            {files.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setFiles([]);
                                        clearResults();
                                    }}
                                    disabled={busy}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-4">
                        {results.length > 0 && (
                            <>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground uppercase">
                                        {results.length} {results.length === 1 ? 'file' : 'files'}
                                    </span>
                                    <span className="font-medium">
                                        {formatBytes(totalOriginal)} → {formatBytes(totalResult)} ({savedPercent(totalOriginal, totalResult)}% saved)
                                    </span>
                                </div>

                                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                                    {results.map((result) => (
                                        <div key={result.name} className="border-border flex items-center gap-3 border p-2">
                                            <img src={result.url} alt={result.name} className="bg-muted size-14 shrink-0 object-contain" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium">{result.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {result.width}×{result.height} · {formatBytes(result.originalSize)} → {formatBytes(result.size)} (
                                                    {savedPercent(result.originalSize, result.size)}%)
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => downloadBlob(result.name, result.blob)}
                                                aria-label={`Download ${result.name}`}
                                            >
                                                <DownloadSimpleIcon />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <Button type="button" variant="outline" onClick={downloadAll} className="w-full">
                                    <DownloadSimpleIcon />
                                    Download all
                                </Button>
                            </>
                        )}

                        {results.length === 0 && (
                            <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed text-center text-xs">
                                <ImageSquareIcon className="size-6" />
                                Compressed images and their size savings appear here.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
