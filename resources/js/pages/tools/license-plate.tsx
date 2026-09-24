import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadBlob } from '@/lib/download';
import { IMAGE_ACCEPT, canvasToBlob, loadImageFromFile, obfuscateRegion, validateImageFile } from '@/lib/image';
import {
    PLATE_INPUT_HEIGHT,
    PLATE_INPUT_WIDTH,
    decodeDetections,
    nonMaxSuppression,
    plateModelUrl,
    plateOrtUrl,
    prepareModelInput,
    type PlateDetection,
} from '@/lib/license-plate';
import { CarIcon, DownloadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { InferenceSession } from 'onnxruntime-web';
import { useEffect, useRef, useState } from 'react';

type ObfuscateMode = 'blur' | 'pixelate' | 'solid';
type Phase = 'idle' | 'loading' | 'running' | 'done' | 'error';

interface DetectedPlate extends PlateDetection {
    text?: string;
}

const MODEL_SIZE_LABEL = '~57 MB';

export default function LicensePlateTool() {
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [detections, setDetections] = useState<DetectedPlate[]>([]);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [mode, setMode] = useState<ObfuscateMode>('blur');
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const objectUrls = useRef<string[]>([]);
    const sessionRef = useRef<InferenceSession | null>(null);

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
        setDetections([]);
        setPhase('idle');
        setProgress('');
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
            setPhase('error');
            setError(problem);

            return;
        }

        setFile(candidate);
        reset();

        const url = URL.createObjectURL(candidate);

        objectUrls.current.push(url);
        setSourceUrl(url);
    };

    const loadSession = async () => {
        if (sessionRef.current !== null) {
            return sessionRef.current;
        }

        // Import the wasm-only build so it requests ort-wasm-simd-threaded.{mjs,wasm}
        // instead of the WebGPU/jsep files we do not ship.
        const ort = await import('onnxruntime-web/wasm');

        ort.env.wasm.wasmPaths = plateOrtUrl();
        ort.env.wasm.numThreads = 1;

        const session = await ort.InferenceSession.create(plateModelUrl(), {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
        });

        sessionRef.current = session;

        return session;
    };

    const detect = async () => {
        if (!file) {
            return;
        }

        setError(null);
        setDetections([]);
        setResultUrl(null);
        setResultBlob(null);
        setPhase('loading');
        setProgress(`Loading detection model (${MODEL_SIZE_LABEL}, cached after the first run)…`);

        try {
            const ort = await import('onnxruntime-web/wasm');
            const session = await loadSession();
            const image = await loadImageFromFile(file);
            const input = prepareModelInput(image);

            setPhase('running');
            setProgress('Looking for license plates…');

            const tensor = new ort.Tensor('float32', input.data, [1, 3, PLATE_INPUT_HEIGHT, PLATE_INPUT_WIDTH]);
            const outputs = await session.run({ [session.inputNames[0]]: tensor });
            const tensors = session.outputNames.map((name) => outputs[name]);

            const boxesTensor = tensors.find((tensor) => tensor.dims[tensor.dims.length - 1] === 4);
            const logitsTensor = tensors.find((tensor) => tensor !== boxesTensor);

            if (!boxesTensor || !logitsTensor) {
                throw new Error('The model returned an unexpected output shape.');
            }

            const numClasses = logitsTensor.dims[logitsTensor.dims.length - 1];
            const raw = decodeDetections(logitsTensor.data as Float32Array, boxesTensor.data as Float32Array, {
                numClasses,
                imageWidth: image.naturalWidth,
                imageHeight: image.naturalHeight,
            });
            const found = nonMaxSuppression(raw);

            if (found.length === 0) {
                setPhase('error');
                setError('No license plates were detected. Try a clearer, closer photo.');

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
            found.forEach((box) => obfuscateRegion(context, box, canvas.width, canvas.height, mode));

            const blob = await canvasToBlob(canvas, 'image/png');
            const url = URL.createObjectURL(blob);

            objectUrls.current.push(url);
            setDetections(found);
            setResultBlob(blob);
            setResultUrl(url);
            setPhase('done');
            setProgress('');
        } catch (exception) {
            setPhase('error');
            setError(exception instanceof Error ? exception.message : 'Could not run detection.');
        }
    };

    const download = () => {
        if (!resultBlob || !file) {
            return;
        }

        downloadBlob(`${file.name.replace(/\.[^/.]+$/, '') || 'image'}-plates-redacted.png`, resultBlob);
    };

    const busy = phase === 'loading' || phase === 'running';

    return (
        <ToolPage slug="license-plate">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <Card>
                    <CardContent className="space-y-4">
                        <FileDrop
                            accept={IMAGE_ACCEPT}
                            icon={<CarIcon className="size-6" />}
                            label={file ? file.name : 'Drop a photo with a vehicle here'}
                            hint="Plates are detected on-device and redacted so you can share the photo safely."
                            onFiles={(files) => acceptFile(files[0])}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="lp-mode">Redaction</Label>
                                <Select value={mode} onValueChange={(value) => setMode(value as ObfuscateMode)} disabled={busy}>
                                    <SelectTrigger id="lp-mode" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blur">Blur</SelectItem>
                                        <SelectItem value="pixelate">Pixelate</SelectItem>
                                        <SelectItem value="solid">Black box</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <p className="text-muted-foreground text-xs">
                                    Detector: YOLOS (license-plate) via onnxruntime-web, {MODEL_SIZE_LABEL}. Experimental: accuracy varies with angle,
                                    blur and region.
                                </p>
                            </div>
                        </div>

                        {busy && <p className="text-muted-foreground text-xs">{progress}</p>}
                        {phase === 'error' && <p className="text-destructive text-sm">{error}</p>}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={detect} disabled={!file || busy}>
                                {busy ? 'Working…' : 'Detect & redact plates'}
                            </Button>
                            {resultUrl && !busy && (
                                <Button type="button" variant="outline" onClick={download}>
                                    <DownloadSimpleIcon />
                                    Download PNG
                                </Button>
                            )}
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Everything runs in your browser. Your photo is never uploaded and no plate data leaves your device.
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:w-96">
                    <CardContent className="space-y-3">
                        <div className="border-border flex h-64 items-center justify-center overflow-hidden border">
                            {resultUrl ? (
                                <img src={resultUrl} alt="Redacted result" className="max-h-full max-w-full object-contain" />
                            ) : sourceUrl ? (
                                <img src={sourceUrl} alt="Original" className="max-h-full max-w-full object-contain opacity-60" />
                            ) : (
                                <span className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                                    <CarIcon className="size-6" />
                                    Upload a photo to detect plates.
                                </span>
                            )}
                        </div>

                        {detections.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs uppercase">
                                    {detections.length} plate{detections.length === 1 ? '' : 's'} detected
                                </p>
                                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                                    {detections.map((detection, index) => (
                                        <li key={index} className="flex items-center justify-between gap-2">
                                            <span className="truncate">
                                                {Math.round(detection.width)}×{Math.round(detection.height)} px · {Math.round(detection.x)},
                                                {Math.round(detection.y)}
                                            </span>
                                            <span className="text-muted-foreground">{Math.round(detection.score * 100)}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="text-muted-foreground flex items-start gap-2 text-xs">
                            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                            Plate reading (OCR) is not enabled here yet; this tool focuses on locating and redacting plates.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </ToolPage>
    );
}
