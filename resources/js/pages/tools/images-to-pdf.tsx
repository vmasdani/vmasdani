import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { IMAGE_ACCEPT, fileToPdfImage, validateImageFile } from '@/lib/image';
import { imagesToPdf, type PdfPageSize } from '@/lib/pdf';
import { ArrowDownIcon, ArrowUpIcon, FilePdfIcon, ImagesIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

interface ImageItem {
    id: string;
    file: File;
    url: string;
}

const PAGE_SIZES: { value: PdfPageSize; label: string }[] = [
    { value: 'fit', label: 'Fit to image' },
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Letter' },
];

export default function ImagesToPdfTool() {
    const [items, setItems] = useState<ImageItem[]>([]);
    const [pageSize, setPageSize] = useState<PdfPageSize>('fit');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [margin, setMargin] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const createdUrls = useRef<string[]>([]);

    useEffect(() => {
        const urls = createdUrls;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const acceptFiles = (files: File[]) => {
        setError(null);

        const problems = files.map(validateImageFile).filter((problem): problem is string => problem !== null);

        if (problems.length > 0) {
            setError(problems[0]);

            return;
        }

        const added = files.map((file) => {
            const url = URL.createObjectURL(file);

            createdUrls.current.push(url);

            return { id: crypto.randomUUID(), file, url };
        });

        setItems((current) => [...current, ...added]);
    };

    const move = (index: number, direction: -1 | 1) => {
        setItems((current) => {
            const target = index + direction;

            if (target < 0 || target >= current.length) {
                return current;
            }

            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];

            return next;
        });
    };

    const build = async () => {
        if (items.length === 0) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const images = await Promise.all(items.map((item) => fileToPdfImage(item.file)));
            const output = await imagesToPdf(images, { pageSize, orientation, margin: Math.max(0, margin) });

            downloadBlob('images.pdf', new Blob([output], { type: 'application/pdf' }));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not build the PDF.');
        } finally {
            setBusy(false);
        }
    };

    const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);

    return (
        <ToolPage slug="images-to-pdf">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            multiple
                            icon={<ImagesIcon className="size-6" />}
                            label="Drop images here or click to browse"
                            hint="PNG and JPEG are embedded directly; other formats are re-encoded to PNG first."
                            onFiles={acceptFiles}
                        />

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="ip-size">Page size</Label>
                                <Select value={pageSize} onValueChange={(value) => setPageSize(value as PdfPageSize)}>
                                    <SelectTrigger id="ip-size" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ip-orientation">Orientation</Label>
                                <Select
                                    value={orientation}
                                    onValueChange={(value) => setOrientation(value as 'portrait' | 'landscape')}
                                    disabled={pageSize === 'fit'}
                                >
                                    <SelectTrigger id="ip-orientation" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="portrait">Portrait</SelectItem>
                                        <SelectItem value="landscape">Landscape</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ip-margin">Margin (pt)</Label>
                                <Input
                                    id="ip-margin"
                                    type="number"
                                    min={0}
                                    value={margin}
                                    onChange={(event) => setMargin(Number(event.target.value))}
                                />
                            </div>
                        </div>

                        <p className="text-muted-foreground text-xs">
                            One image per page, centred. Orientation is ignored when the page is sized to the image.
                        </p>

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <Button type="button" onClick={build} disabled={items.length === 0 || busy}>
                            {busy ? 'Building…' : `Create PDF (${items.length} page${items.length === 1 ? '' : 's'})`}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        {items.length === 0 ? (
                            <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed text-center text-xs">
                                <FilePdfIcon className="size-6" />
                                Added images appear here, one per page.
                            </div>
                        ) : (
                            <>
                                <div className="text-muted-foreground text-xs uppercase">
                                    {items.length} pages · {formatBytes(totalSize)}
                                </div>
                                <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">
                                    {items.map((item, index) => (
                                        <li key={item.id} className="border-border flex items-center gap-2 border p-2">
                                            <img src={item.url} alt={item.file.name} className="bg-muted size-12 shrink-0 object-contain" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium">
                                                    {index + 1}. {item.file.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs">{formatBytes(item.file.size)}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => move(index, -1)}
                                                disabled={index === 0}
                                                aria-label="Move up"
                                            >
                                                <ArrowUpIcon />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => move(index, 1)}
                                                disabled={index === items.length - 1}
                                                aria-label="Move down"
                                            >
                                                <ArrowDownIcon />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                                                aria-label={`Remove ${item.file.name}`}
                                            >
                                                <XIcon />
                                            </Button>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
