import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BACKGROUND_MODES, backgroundColorFileName, blurRadiusForStrength, compositeBackground, type BackgroundMode } from '@/lib/background-blur';
import { BACKGROUND_REMOVAL_MODELS, backgroundRemovalConfig, validateImageFile } from '@/lib/background-removal';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import { IMAGE_ACCEPT, canvasToBlob, loadImageFromBlob, loadImageFromFile } from '@/lib/image';
import { ApertureIcon, DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'fetching' | 'computing' | 'done' | 'error';

export default function BackgroundBlurTool() {
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [mode, setMode] = useState<BackgroundMode>('blur');
    const [strength, setStrength] = useState(60);
    const [color, setColor] = useState('#f4f4f5');
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState('');
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const objectUrls = useRef<string[]>([]);

    useEffect(() => {
        const urls = objectUrls;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const resetPreview = () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current = [];
        setResultUrl(null);
        setResultBlob(null);
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
            setSourceUrl(null);
            resetPreview();
            setPhase('error');
            setError(problem);

            return;
        }

        setFile(candidate);
        resetPreview();
        setSourceUrl(null);

        const url = URL.createObjectURL(candidate);

        objectUrls.current.push(url);
        setSourceUrl(url);
    };

    const run = async () => {
        if (!file) {
            return;
        }

        setPhase('fetching');
        setProgress(`Preparing model (${BACKGROUND_REMOVAL_MODELS[0].sizeLabel})…`);
        setProgressPercent(0);
        setError(null);

        try {
            const { removeBackground } = await import('@imgly/background-removal');
            const config = backgroundRemovalConfig('isnet_fp16');

            config.progress = (key, current, total) => {
                if (key.startsWith('fetch:')) {
                    setPhase('fetching');
                    setProgressPercent(Math.round((current / total) * 100));
                    setProgress(`Downloading model… ${formatBytes(current)} of ${formatBytes(total)}`);
                } else {
                    setPhase('computing');
                    setProgressPercent(null);
                    setProgress('Blurring the background…');
                }
            };

            const cutout = await removeBackground(file, config);
            const original = await loadImageFromFile(file);
            const cutoutImage = await loadImageFromBlob(cutout);
            const width = original.naturalWidth;
            const height = original.naturalHeight;
            const canvas = compositeBackground(original, cutoutImage, width, height, {
                mode,
                radius: blurRadiusForStrength(strength, Math.max(width, height)),
                color,
            });
            const blob = await canvasToBlob(canvas, 'image/png');
            const url = URL.createObjectURL(blob);

            objectUrls.current.push(url);
            setResultBlob(blob);
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
        if (!resultBlob || !file) {
            return;
        }

        downloadBlob(mode === 'blur' ? backgroundColorFileName(file.name, 'blur') : backgroundColorFileName(file.name, 'color'), resultBlob);
    };

    const busy = phase === 'fetching' || phase === 'computing';

    return (
        <ToolPage slug="background-blur">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            icon={<ApertureIcon className="size-6" />}
                            label={file ? file.name : 'Drop a photo here or click to browse'}
                            hint="The subject is detected on-device, then the background is blurred or recoloured."
                            onFiles={(files) => acceptFile(files[0])}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="bb-mode">Background</Label>
                                <Select value={mode} onValueChange={(value) => setMode(value as BackgroundMode)} disabled={busy}>
                                    <SelectTrigger id="bb-mode" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BACKGROUND_MODES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {mode === 'blur' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="bb-strength">Blur strength {strength}%</Label>
                                    <Input
                                        id="bb-strength"
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={strength}
                                        disabled={busy}
                                        onChange={(event) => setStrength(Number(event.target.value))}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="bb-color">Colour</Label>
                                    <input
                                        id="bb-color"
                                        type="color"
                                        value={color}
                                        disabled={busy}
                                        onChange={(event) => setColor(event.target.value)}
                                        className="border-input h-8 w-full cursor-pointer rounded-none border bg-transparent"
                                    />
                                </div>
                            )}
                        </div>

                        {phase === 'fetching' || phase === 'computing' ? (
                            <div className="space-y-2">
                                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                    <div
                                        className={`bg-primary h-full rounded-full transition-all duration-300 ${phase === 'computing' ? 'animate-pulse' : ''}`}
                                        style={phase === 'fetching' ? { width: `${progressPercent ?? 0}%` } : { width: '100%' }}
                                    />
                                </div>
                                <p className="text-muted-foreground text-xs">{progress}</p>
                            </div>
                        ) : null}

                        {phase === 'error' && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={run} disabled={!file || busy}>
                                {busy ? 'Working…' : 'Blur background'}
                            </Button>
                            {resultUrl && !busy && (
                                <Button type="button" variant="outline" onClick={download}>
                                    <DownloadSimpleIcon />
                                    Download PNG
                                </Button>
                            )}
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Everything runs in your browser with an on-device AI model. Your photo never leaves your device.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs font-medium uppercase">Result</p>
                            <div className="border-border flex h-64 items-center justify-center overflow-hidden border">
                                {resultUrl ? (
                                    <img src={resultUrl} alt="Background blurred" className="max-h-full max-w-full object-contain" />
                                ) : sourceUrl ? (
                                    <img src={sourceUrl} alt="Original" className="max-h-full max-w-full object-contain opacity-60" />
                                ) : (
                                    <span className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                                        <UploadSimpleIcon className="size-6" />
                                        Upload a photo to preview the result.
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
