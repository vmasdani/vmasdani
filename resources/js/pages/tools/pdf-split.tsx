import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadBlob } from '@/lib/download';
import { extractPages, parsePageRanges, pdfPageCount, rotatePages, splitPages } from '@/lib/pdf';
import { FilePdfIcon, ScissorsIcon } from '@phosphor-icons/react';
import { useState } from 'react';

const ROTATIONS = [
    { value: 0, label: 'No rotation' },
    { value: 90, label: '90° clockwise' },
    { value: 180, label: '180°' },
    { value: 270, label: '90° counter-clockwise' },
];

export default function PdfSplitTool() {
    const [name, setName] = useState('document.pdf');
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [range, setRange] = useState('');
    const [rotation, setRotation] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async (file: File) => {
        setError(null);
        setBuffer(null);
        setPageCount(0);
        setRange('');

        try {
            const source = await file.arrayBuffer();

            setPageCount(await pdfPageCount(source));
            setBuffer(source);
            setName(file.name);
        } catch {
            setError('Could not read that PDF. It may be encrypted or corrupt.');
        }
    };

    const extract = async () => {
        if (!buffer) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const indices = parsePageRanges(range, pageCount);
            let output = await extractPages(buffer, indices);

            if (rotation !== 0) {
                output = await rotatePages(
                    output,
                    indices.map(() => rotation),
                );
            }

            downloadBlob(`${name.replace(/\.[^/.]+$/, '') || 'document'}-extracted.pdf`, new Blob([output], { type: 'application/pdf' }));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not extract those pages.');
        } finally {
            setBusy(false);
        }
    };

    const splitAll = async () => {
        if (!buffer) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const parts = await splitPages(buffer);
            const base = name.replace(/\.[^/.]+$/, '') || 'document';

            for (let index = 0; index < parts.length; index++) {
                const part = rotation === 0 ? parts[index] : await rotatePages(parts[index], [rotation]);

                downloadBlob(`${base}-page-${String(index + 1).padStart(2, '0')}.pdf`, new Blob([part], { type: 'application/pdf' }));
            }
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not split that PDF.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ToolPage slug="pdf-split">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept="application/pdf"
                            icon={<ScissorsIcon className="size-6" />}
                            label="Drop a PDF here or click to browse"
                            hint="Extract a page range into a new PDF, or split every page into its own file."
                            onFiles={(files) => void load(files[0])}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="ps-range">Pages to extract</Label>
                                <Input
                                    id="ps-range"
                                    value={range}
                                    onChange={(event) => setRange(event.target.value)}
                                    placeholder={pageCount > 0 ? `e.g. 1-3,5 (of ${pageCount})` : 'e.g. 1-3,5'}
                                    disabled={!buffer}
                                />
                                <p className="text-muted-foreground text-xs">
                                    Leave blank to keep every page. Order is respected, e.g. 3-1 reverses.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ps-rotation">Rotate output</Label>
                                <Select value={String(rotation)} onValueChange={(value) => setRotation(Number(value))} disabled={!buffer}>
                                    <SelectTrigger id="ps-rotation" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROTATIONS.map((option) => (
                                            <SelectItem key={option.value} value={String(option.value)}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={extract} disabled={!buffer || busy}>
                                {busy ? 'Working…' : 'Extract to one PDF'}
                            </Button>
                            <Button type="button" variant="outline" onClick={splitAll} disabled={!buffer || busy}>
                                Split into single pages
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Processing happens in your browser. If your browser blocks multiple downloads, allow them for this site and retry.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-80">
                    <CardContent className="flex h-full flex-col gap-3">
                        {buffer ? (
                            <div className="border-border flex flex-1 flex-col items-center justify-center gap-2 border p-6 text-center">
                                <FilePdfIcon className="text-primary size-10" />
                                <p className="max-w-full truncate text-sm font-medium">{name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {pageCount} page{pageCount === 1 ? '' : 's'}
                                </p>
                            </div>
                        ) : (
                            <div className="border-border text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 border border-dashed p-6 text-center text-xs">
                                <FilePdfIcon className="size-6" />
                                Load a PDF to see its page count.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
