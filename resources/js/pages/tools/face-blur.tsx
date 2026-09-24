import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadBlob } from '@/lib/download';
import { FACE_BLUR_MODES, expandBox, faceBoxToRegion, faceModelUrl, faceResultFileName, faceWasmUrl, type FaceBlurMode } from '@/lib/face-blur';
import { IMAGE_ACCEPT, canvasToBlob, loadImageFromFile, obfuscateRegion, validateImageFile } from '@/lib/image';
import { DownloadSimpleIcon, SmileyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

export default function FaceBlurTool() {
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [count, setCount] = useState(0);
    const [mode, setMode] = useState<FaceBlurMode>('blur');
    const [expand, setExpand] = useState(20);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const objectUrls = useRef<string[]>([]);

    useEffect(() => {
        const urls = objectUrls;

        return () => {
            urls.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const reset = () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current = [];
        setResultUrl(null);
        setResultBlob(null);
        setCount(0);
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
            reset();
            setError(problem);

            return;
        }

        setFile(candidate);
        reset();
        setSourceUrl(null);

        const url = URL.createObjectURL(candidate);

        objectUrls.current.push(url);
        setSourceUrl(url);
    };

    const run = async () => {
        if (!file) {
            return;
        }

        setBusy(true);
        setError(null);
        setResultUrl(null);
        setResultBlob(null);
        setCount(0);

        try {
            const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
            const vision = await FilesetResolver.forVisionTasks(faceWasmUrl());
            const detector = await FaceDetector.createFromOptions(vision, {
                baseOptions: { modelAssetPath: faceModelUrl(), delegate: 'CPU' },
                runningMode: 'IMAGE',
            });

            const image = await loadImageFromFile(file);
            const result = detector.detect(image);
            const boxes = result.detections
                .map((detection) => detection.boundingBox)
                .filter((box): box is NonNullable<typeof box> => box !== undefined);

            detector.close();

            if (boxes.length === 0) {
                setError('No faces were detected in that photo.');
                setBusy(false);

                return;
            }

            const canvas = document.createElement('canvas');

            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d');

            if (context === null) {
                throw new Error('Canvas is unavailable in this browser.');
            }

            context.drawImage(image, 0, 0);

            boxes.forEach((box) => {
                const region = expandBox(
                    faceBoxToRegion({ originX: box.originX, originY: box.originY, width: box.width, height: box.height }),
                    expand,
                );

                obfuscateRegion(context, region, canvas.width, canvas.height, mode);
            });

            const blob = await canvasToBlob(canvas, 'image/png');
            const url = URL.createObjectURL(blob);

            objectUrls.current.push(url);
            setCount(boxes.length);
            setResultBlob(blob);
            setResultUrl(url);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not process that image.');
        } finally {
            setBusy(false);
        }
    };

    const download = () => {
        if (resultBlob && file) {
            downloadBlob(faceResultFileName(file.name), resultBlob);
        }
    };

    return (
        <ToolPage slug="face-blur">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            icon={<SmileyIcon className="size-6" />}
                            label={file ? file.name : 'Drop a photo here or click to browse'}
                            hint="Faces are detected on-device, then blurred or pixelated before you share the photo."
                            onFiles={(files) => acceptFile(files[0])}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="fb-mode">Redaction</Label>
                                <Select value={mode} onValueChange={(value) => setMode(value as FaceBlurMode)} disabled={busy}>
                                    <SelectTrigger id="fb-mode" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FACE_BLUR_MODES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="fb-expand">Extra margin {expand}%</Label>
                                <Input
                                    id="fb-expand"
                                    type="range"
                                    min={0}
                                    max={60}
                                    step={5}
                                    value={expand}
                                    disabled={busy}
                                    onChange={(event) => setExpand(Number(event.target.value))}
                                />
                            </div>
                        </div>

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={run} disabled={!file || busy}>
                                {busy ? 'Detecting…' : 'Detect & blur faces'}
                            </Button>
                            {resultUrl && !busy && (
                                <Button type="button" variant="outline" onClick={download}>
                                    <DownloadSimpleIcon />
                                    Download PNG
                                </Button>
                            )}
                        </div>

                        <p className="text-muted-foreground flex items-start gap-2 text-xs">
                            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                            Detection can miss faces at odd angles or in low light. Check the result before sharing.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        <div className="border-border flex h-64 items-center justify-center overflow-hidden border">
                            {resultUrl ? (
                                <img src={resultUrl} alt="Faces blurred" className="max-h-full max-w-full object-contain" />
                            ) : sourceUrl ? (
                                <img src={sourceUrl} alt="Original" className="max-h-full max-w-full object-contain opacity-60" />
                            ) : (
                                <span className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                                    <SmileyIcon className="size-6" />
                                    Upload a photo to blur its faces.
                                </span>
                            )}
                        </div>

                        {count > 0 && (
                            <p className="text-muted-foreground text-xs uppercase">
                                {count} face{count === 1 ? '' : 's'} redacted
                            </p>
                        )}

                        <p className="text-muted-foreground text-xs">Everything runs on-device with MediaPipe. Your photo is never uploaded.</p>
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
