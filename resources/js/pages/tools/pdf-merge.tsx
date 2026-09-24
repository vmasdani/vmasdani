import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { mergePdfs, pdfPageCount } from '@/lib/pdf';
import { ArrowDownIcon, ArrowUpIcon, FilePdfIcon, StackSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

interface PdfItem {
    id: string;
    file: File;
    pages: number | null;
}

export default function PdfMergeTool() {
    const [items, setItems] = useState<PdfItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const acceptFiles = async (files: File[]) => {
        setError(null);

        const added: PdfItem[] = files.map((file) => ({
            id: crypto.randomUUID(),
            file,
            pages: null,
        }));

        setItems((current) => [...current, ...added]);

        for (const item of added) {
            try {
                const pages = await pdfPageCount(await item.file.arrayBuffer());

                setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, pages } : entry)));
            } catch {
                setError(`Could not read ${item.file.name}. It may be encrypted or corrupt.`);
                setItems((current) => current.filter((entry) => entry.id !== item.id));
            }
        }
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

    const merge = async () => {
        if (items.length < 2) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const sources = await Promise.all(items.map((item) => item.file.arrayBuffer()));
            const merged = await mergePdfs(sources);

            downloadBlob('merged.pdf', new Blob([merged], { type: 'application/pdf' }));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not merge those PDFs.');
        } finally {
            setBusy(false);
        }
    };

    const totalPages = items.reduce((sum, item) => sum + (item.pages ?? 0), 0);

    return (
        <ToolPage slug="pdf-merge">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept="application/pdf"
                            multiple
                            icon={<StackSimpleIcon className="size-6" />}
                            label="Drop PDFs here or click to browse"
                            hint="Add two or more files, then arrange them in the order you want."
                            onFiles={(files) => void acceptFiles(files)}
                        />

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <Button type="button" onClick={merge} disabled={items.length < 2 || busy}>
                            {busy ? 'Merging…' : `Merge ${items.length} PDFs`}
                        </Button>

                        <p className="text-muted-foreground text-xs">
                            Files are combined in your browser. They are never uploaded, so nothing leaves your device.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        {items.length === 0 ? (
                            <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed text-center text-xs">
                                <FilePdfIcon className="size-6" />
                                Added PDFs appear here, in merge order.
                            </div>
                        ) : (
                            <>
                                <div className="text-muted-foreground text-xs uppercase">
                                    {items.length} files · {totalPages} pages
                                </div>
                                <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">
                                    {items.map((item, index) => (
                                        <li key={item.id} className="border-border flex items-center gap-2 border p-2">
                                            <span className="text-muted-foreground w-5 text-center text-xs font-medium">{index + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium">{item.file.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {item.pages === null ? 'Reading…' : `${item.pages} page${item.pages === 1 ? '' : 's'}`} ·{' '}
                                                    {formatBytes(item.file.size)}
                                                </p>
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
