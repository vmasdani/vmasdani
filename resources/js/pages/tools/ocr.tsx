import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { downloadBlob } from '@/lib/download';
import { IMAGE_ACCEPT, validateImageFile } from '@/lib/image';
import { DEFAULT_OCR_LANGUAGE, OCR_LANGUAGES, normalizeOcrText, ocrCoreUrl, ocrTessdataUrl, ocrTextFileName, ocrWorkerUrl } from '@/lib/ocr';
import { DownloadSimpleIcon, FileTextIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

export default function OcrTool() {
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [language, setLanguage] = useState(DEFAULT_OCR_LANGUAGE);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
    const objectUrls = useRef<string[]>([]);

    useEffect(() => {
        const urls = objectUrls;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
            void workerRef.current?.terminate();
        };
    }, []);

    const acceptFile = (candidate: File | undefined | null) => {
        if (!candidate) {
            return;
        }

        const problem = validateImageFile(candidate);

        if (problem !== null) {
            setError(problem);
            setFile(null);
            setSourceUrl(null);

            return;
        }

        setError(null);
        setText('');
        setFile(candidate);
        setSourceUrl(null);

        const url = URL.createObjectURL(candidate);

        objectUrls.current.push(url);
        setSourceUrl(url);
    };

    const recognize = async () => {
        if (!file) {
            return;
        }

        setBusy(true);
        setText('');
        setError(null);
        setProgress('Preparing the OCR engine…');

        try {
            await workerRef.current?.terminate();

            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker(language, 1, {
                workerPath: ocrWorkerUrl(),
                corePath: ocrCoreUrl(),
                langPath: ocrTessdataUrl(),
                logger: (message: { status: string; progress: number }) => {
                    setProgress(`${message.status} ${Math.round((message.progress || 0) * 100)}%`);
                },
            });

            workerRef.current = worker;

            const { data } = await worker.recognize(file);

            setText(normalizeOcrText(data.text));
            setProgress('');
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not read text from that image.');
        } finally {
            await workerRef.current?.terminate();
            workerRef.current = null;
            setBusy(false);
        }
    };

    const downloadText = () => {
        if (file) {
            downloadBlob(ocrTextFileName(file.name), new Blob([text], { type: 'text/plain;charset=utf-8' }));
        }
    };

    return (
        <ToolPage slug="ocr">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            icon={<FileTextIcon className="size-6" />}
                            label={file ? file.name : 'Drop an image or screenshot here'}
                            hint="Text is recognised on-device with a self-hosted OCR engine. Nothing is uploaded."
                            onFiles={(files) => acceptFile(files[0])}
                        />

                        <div className="grid gap-2 sm:max-w-xs">
                            <Label htmlFor="ocr-language">Language</Label>
                            <Select value={language} onValueChange={setLanguage} disabled={busy}>
                                <SelectTrigger id="ocr-language" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {OCR_LANGUAGES.map((option) => (
                                        <SelectItem key={option.code} value={option.code}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" onClick={recognize} disabled={!file || busy}>
                                {busy ? 'Reading…' : 'Extract text'}
                            </Button>
                            {text !== '' && (
                                <Button type="button" variant="outline" onClick={downloadText}>
                                    <DownloadSimpleIcon />
                                    Download .txt
                                </Button>
                            )}
                        </div>

                        {busy && progress !== '' && (
                            <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                <SpinnerGapIcon className="size-3 animate-spin" />
                                {progress}
                            </p>
                        )}

                        <p className="text-muted-foreground text-xs">
                            The first run downloads the OCR engine and language data once; your browser caches it for later.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        {sourceUrl && <img src={sourceUrl} alt="Original" className="max-h-40 w-full border object-contain" />}

                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="ocr-output">Extracted text</Label>
                            <CopyButton value={text} label="Copy" />
                        </div>

                        <Textarea id="ocr-output" readOnly value={text} placeholder="Recognised text appears here." className="min-h-64 text-xs" />
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
