import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BACKGROUND_REMOVAL_MODELS,
    backgroundRemovalConfig,
    formatBytes,
    resultFileName,
    validateImageFile,
    type BackgroundRemovalModel,
} from '@/lib/background-removal';
import { DownloadSimpleIcon, ImageSquareIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'fetching' | 'computing' | 'done' | 'error';

const CHECKERBOARD = 'repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 0 0 / 20px 20px';

export default function BackgroundRemoverTool() {
    const [model, setModel] = useState<BackgroundRemovalModel>('isnet_fp16');
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState<string>('');
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const objectUrls = useRef<string[]>([]);

    const rememberUrl = useCallback((url: string) => {
        objectUrls.current.push(url);

        return url;
    }, []);

    useEffect(() => {
        return () => {
            objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const resetPreview = () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current = [];
        setSourceUrl(null);
        setResultUrl(null);
        setPhase('idle');
        setProgress('');
        setProgressPercent(null);
        setError(null);
    };

    const acceptFile = (candidate: File | undefined | null) => {
        if (!candidate) {
            return;
        }

        const problem = validateImageFile(candidate);

        if (problem !== null) {
            setFile(null);
            resetPreview();
            setPhase('error');
            setError(problem);

            return;
        }

        setFile(candidate);
        resetPreview();
        setSourceUrl(rememberUrl(URL.createObjectURL(candidate)));
    };

    const runRemoval = async () => {
        if (!file) {
            return;
        }

        setPhase('fetching');
        setProgress(`Downloading model (${BACKGROUND_REMOVAL_MODELS.find((option) => option.value === model)?.sizeLabel})…`);
        setProgressPercent(0);
        setError(null);

        try {
            const { removeBackground } = await import('@imgly/background-removal');
            const config = backgroundRemovalConfig(model);

            config.progress = (key, current, total) => {
                if (key.startsWith('fetch:')) {
                    setPhase('fetching');
                    setProgressPercent(Math.round((current / total) * 100));
                    setProgress(`Downloading model… ${formatBytes(current)} of ${formatBytes(total)}`);
                } else {
                    setPhase('computing');
                    setProgressPercent(null);
                    setProgress('Removing the background…');
                }
            };

            const blob = await removeBackground(file, config);
            const url = rememberUrl(URL.createObjectURL(blob));

            setResultUrl(url);
            setPhase('done');
            setProgress('');
            setProgressPercent(null);
        } catch (exception) {
            setPhase('error');
            setError(exception instanceof Error ? exception.message : 'Could not process that image. Try a different one.');
        }
    };

    const download = () => {
        if (!resultUrl || !file) {
            return;
        }

        const anchor = document.createElement('a');

        anchor.href = resultUrl;
        anchor.download = resultFileName(file.name);

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    const busy = phase === 'fetching' || phase === 'computing';

    return (
        <ToolPage slug="background-remover">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="br-model">Model</Label>
                            <Select value={model} onValueChange={(value) => setModel(value as BackgroundRemovalModel)} disabled={busy}>
                                <SelectTrigger id="br-model" className="w-full sm:w-72">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BACKGROUND_REMOVAL_MODELS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label} ({option.sizeLabel})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-xs">
                                {BACKGROUND_REMOVAL_MODELS.find((option) => option.value === model)?.description} The model is downloaded once, then
                                cached by your browser.
                            </p>
                        </div>

                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Upload an image"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    inputRef.current?.click();
                                }
                            }}
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragOver(false);
                                acceptFile(event.dataTransfer.files?.[0]);
                            }}
                            className={`border-input flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm transition-colors ${
                                dragOver ? 'border-primary text-primary' : 'text-muted-foreground hover:border-primary/50'
                            }`}
                        >
                            <UploadSimpleIcon className="size-6" />
                            {file ? (
                                <span className="max-w-full truncate px-4 font-medium">{file.name}</span>
                            ) : (
                                <span className="px-4">Drop an image here or click to browse</span>
                            )}
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp"
                                className="hidden"
                                onChange={(event) => {
                                    acceptFile(event.target.files?.[0]);
                                    event.target.value = '';
                                }}
                            />
                        </div>

                        {phase === 'fetching' || phase === 'computing' ? (
                            <div className="space-y-2">
                                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                    <div
                                        className={`bg-primary h-full rounded-full transition-all duration-300 ${
                                            phase === 'computing' ? 'animate-pulse' : ''
                                        }`}
                                        style={phase === 'fetching' ? { width: `${progressPercent ?? 0}%` } : { width: '100%' }}
                                    />
                                </div>
                                <p className="text-muted-foreground text-xs">{progress}</p>
                            </div>
                        ) : null}

                        {phase === 'error' && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={runRemoval} disabled={!file || busy}>
                                {busy ? 'Working…' : 'Remove background'}
                            </Button>
                            {file && (
                                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
                                    Change image
                                </Button>
                            )}
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Everything runs in your browser with an on-device AI model. Your photo never leaves your machine.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="flex flex-col gap-4">
                        {sourceUrl && (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-medium uppercase">Original</p>
                                <div className="border-border flex h-56 items-center justify-center overflow-hidden border">
                                    <img src={sourceUrl} alt="Original upload" className="max-h-full max-w-full object-contain" />
                                </div>
                            </div>
                        )}

                        {resultUrl && (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-medium uppercase">Cutout</p>
                                <div
                                    className="border-border flex h-56 items-center justify-center overflow-hidden border"
                                    style={{ background: CHECKERBOARD }}
                                >
                                    <img src={resultUrl} alt="Background removed" className="max-h-full max-w-full object-contain" />
                                </div>
                            </div>
                        )}

                        {!sourceUrl && (
                            <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed text-center text-xs">
                                <ImageSquareIcon className="size-6" />
                                Upload an image to see the preview here.
                            </div>
                        )}

                        {phase === 'done' && resultUrl && (
                            <Button type="button" variant="outline" onClick={download} className="w-full">
                                <DownloadSimpleIcon />
                                Download PNG
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
