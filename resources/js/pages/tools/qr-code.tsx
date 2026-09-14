import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QR_ERROR_LEVELS, qrPngDataUrl, qrSvg, type QrErrorCorrection } from '@/lib/qr-code';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

export default function QrCodeTool() {
    const [text, setText] = useState('https://vmasdani.my.id');
    const [errorCorrection, setErrorCorrection] = useState<QrErrorCorrection>('M');
    const [margin, setMargin] = useState(4);
    const [dark, setDark] = useState('#000000');
    const [light, setLight] = useState('#ffffff');

    const { svg, error } = useMemo(() => {
        if (text.trim() === '') {
            return { svg: '', error: null as string | null };
        }

        try {
            return { svg: qrSvg({ text, errorCorrection, margin, dark, light }), error: null as string | null };
        } catch (exception) {
            return { svg: '', error: exception instanceof Error ? exception.message : 'Could not generate a QR code.' };
        }
    }, [text, errorCorrection, margin, dark, light]);

    const downloadSvg = () => {
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

        triggerDownload('qr-code.svg', url);
        URL.revokeObjectURL(url);
    };

    const downloadPng = () => {
        triggerDownload('qr-code.png', qrPngDataUrl({ text, errorCorrection, margin, dark, light }, 1024));
    };

    return (
        <ToolPage slug="qr-code">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="qr-text">Text or URL</Label>
                            <Textarea
                                id="qr-text"
                                value={text}
                                spellCheck={false}
                                onChange={(event) => setText(event.target.value)}
                                placeholder="https://example.com"
                                className="min-h-32 font-mono"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="qr-ecl">Error correction</Label>
                                <Select value={errorCorrection} onValueChange={(value) => setErrorCorrection(value as QrErrorCorrection)}>
                                    <SelectTrigger id="qr-ecl" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QR_ERROR_LEVELS.map((level) => (
                                            <SelectItem key={level.value} value={level.value}>
                                                {level.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="qr-margin">Quiet zone (modules)</Label>
                                <Input
                                    id="qr-margin"
                                    type="number"
                                    min={0}
                                    max={12}
                                    value={margin}
                                    onChange={(event) => setMargin(Number(event.target.value))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="qr-dark">Foreground</Label>
                                <input
                                    id="qr-dark"
                                    type="color"
                                    value={dark}
                                    onChange={(event) => setDark(event.target.value)}
                                    className="border-input h-8 w-full cursor-pointer rounded-none border bg-transparent"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="qr-light">Background</Label>
                                <input
                                    id="qr-light"
                                    type="color"
                                    value={light}
                                    onChange={(event) => setLight(event.target.value)}
                                    className="border-input h-8 w-full cursor-pointer rounded-none border bg-transparent"
                                />
                            </div>
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Everything is generated in your browser. Keep a quiet zone of at least 4 modules, and keep contrast high, so scanners can
                            read the code.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-80">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="flex aspect-square w-full max-w-64 items-center justify-center border">
                            {svg !== '' ? (
                                // Safe: qrSvg() only outputs an <svg> we build from the QR matrix.
                                <div className="size-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
                            ) : (
                                <span className="text-muted-foreground p-6 text-center text-xs">{error ?? 'Enter text to generate a QR code.'}</span>
                            )}
                        </div>

                        {error && <p className="text-destructive text-center text-sm">{error}</p>}

                        <div className="flex w-full flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={downloadSvg} disabled={svg === ''} className="flex-1">
                                <DownloadSimpleIcon />
                                SVG
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={downloadPng} disabled={svg === ''} className="flex-1">
                                <DownloadSimpleIcon />
                                PNG
                            </Button>
                        </div>

                        <CopyButton value={text} label="Copy text" className="w-full" disabled={text === ''} />
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}

function triggerDownload(filename: string, href: string): void {
    const anchor = document.createElement('a');

    anchor.href = href;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}
