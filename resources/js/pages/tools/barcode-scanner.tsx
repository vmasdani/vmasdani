import FileDrop from '@/components/file-drop';
import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COMMON_SCAN_FORMATS, contentHref, scannerWasmUrl } from '@/lib/barcode';
import { BarcodeIcon, CameraIcon, CircleNotchIcon, ImageSquareIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { ReaderOptions, ReadResult } from 'zxing-wasm/reader';

interface ScanResult {
    text: string;
    format: string;
}

const READER_OPTIONS: ReaderOptions = {
    formats: [...COMMON_SCAN_FORMATS] as ReaderOptions['formats'],
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
};

export default function BarcodeScannerTool() {
    const [tab, setTab] = useState('camera');
    const [results, setResults] = useState<ScanResult[]>([]);
    const [scanning, setScanning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const captureRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const scanningRef = useRef(false);
    const readerRef = useRef<typeof import('zxing-wasm/reader') | null>(null);

    const loadReader = async () => {
        if (readerRef.current === null) {
            const zxing = await import('zxing-wasm/reader');

            zxing.prepareZXingModule({
                overrides: {
                    locateFile: (path: string) => (path.endsWith('.wasm') ? scannerWasmUrl() : path),
                },
            });
            readerRef.current = zxing;
        }

        return readerRef.current;
    };

    const stopCamera = () => {
        scanningRef.current = false;
        setScanning(false);

        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (tab !== 'camera') {
            stopCamera();
        }
    }, [tab]);

    const scanFrame = async () => {
        const video = videoRef.current;
        const canvas = captureRef.current;

        if (!scanningRef.current || !video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
            scheduleNext();

            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');

        if (context === null) {
            setError('Canvas is unavailable in this browser.');
            stopCamera();

            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const zxing = await loadReader();
            const found = await zxing.readBarcodes(context.getImageData(0, 0, canvas.width, canvas.height), READER_OPTIONS);

            if (found.length > 0) {
                setResults(toResults(found));
                stopCamera();

                return;
            }
        } catch {
            setError('The scanner failed to initialise.');
            stopCamera();

            return;
        }

        scheduleNext();
    };

    const scheduleNext = () => {
        if (scanningRef.current) {
            timerRef.current = window.setTimeout(() => void scanFrame(), 300);
        }
    };

    const startCamera = async () => {
        setError(null);
        setResults([]);
        setBusy(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            scanningRef.current = true;
            setScanning(true);
            scheduleNext();
        } catch {
            setError('Could not access the camera. Grant permission, or use the image tab instead.');
        } finally {
            setBusy(false);
        }
    };

    const scanFile = async (files: File[]) => {
        const file = files[0];

        if (!file) {
            return;
        }

        setError(null);
        setResults([]);
        setBusy(true);

        try {
            const zxing = await loadReader();
            const found = await zxing.readBarcodes(file, READER_OPTIONS);

            if (found.length === 0) {
                setError('No barcode was found in that image.');
            } else {
                setResults(toResults(found));
            }
        } catch {
            setError('Could not scan that image.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ToolPage slug="barcode-scanner">
            <Tabs
                value={tab}
                onValueChange={(value) => {
                    setTab(value);
                    setResults([]);
                    setError(null);
                }}
            >
                <TabsList>
                    <TabsTrigger value="camera">
                        <CameraIcon className="mr-1" /> Camera
                    </TabsTrigger>
                    <TabsTrigger value="image">
                        <ImageSquareIcon className="mr-1" /> Image file
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="pt-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <Card>
                            <CardContent className="space-y-4">
                                <div className="border-border bg-muted relative flex aspect-video items-center justify-center overflow-hidden border">
                                    <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${scanning ? '' : 'hidden'}`} />
                                    {!scanning && (
                                        <span className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                                            <CameraIcon className="size-8" />
                                            Start the camera and point it at a barcode or QR code.
                                        </span>
                                    )}
                                    {scanning && (
                                        <span className="bg-background/80 absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1 text-xs">
                                            <CircleNotchIcon className="size-3 animate-spin" />
                                            Scanning…
                                        </span>
                                    )}
                                    <canvas ref={captureRef} className="hidden" />
                                </div>

                                {error && <p className="text-destructive text-sm">{error}</p>}

                                <div className="flex flex-wrap gap-2">
                                    {scanning ? (
                                        <Button type="button" variant="outline" onClick={stopCamera}>
                                            <XIcon />
                                            Stop
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={startCamera} disabled={busy}>
                                            {busy ? 'Starting…' : 'Start camera'}
                                        </Button>
                                    )}
                                </div>

                                <p className="text-muted-foreground text-xs">
                                    The camera feed is decoded on your device with zxing-wasm. Frames are never uploaded.
                                </p>
                            </CardContent>
                        </Card>

                        <ResultsPanel results={results} empty="Scanned codes appear here." />
                    </div>
                </TabsContent>

                <TabsContent value="image" className="pt-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <Card>
                            <CardContent className="space-y-4">
                                <FileDrop
                                    accept="image/*"
                                    icon={<BarcodeIcon className="size-6" />}
                                    label="Drop an image or screenshot here"
                                    hint="QR codes, EAN, Code 128, DataMatrix, PDF417 and more."
                                    onFiles={(files) => void scanFile(files)}
                                />
                                {error && <p className="text-destructive text-sm">{error}</p>}
                                <p className="text-muted-foreground text-xs">Decoding happens entirely in your browser.</p>
                            </CardContent>
                        </Card>

                        <ResultsPanel results={results} empty="Decoded codes appear here." />
                    </div>
                </TabsContent>
            </Tabs>
        </ToolPage>
    );
}

function toResults(found: ReadResult[]): ScanResult[] {
    return found.filter((result) => result.text.trim() !== '').map((result) => ({ text: result.text, format: String(result.format) }));
}

function ResultsPanel({ results, empty }: { results: ScanResult[]; empty: string }) {
    return (
        <Card className="lg:w-96">
            <CardContent className="space-y-3">
                {results.length === 0 ? (
                    <div className="border-border text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 border border-dashed p-6 text-center text-xs">
                        <BarcodeIcon className="size-6" />
                        {empty}
                    </div>
                ) : (
                    <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
                        {results.map((result, index) => (
                            <li key={`${result.text}-${index}`} className="border-border space-y-2 border p-3">
                                <span className="bg-muted text-muted-foreground inline-block px-2 py-0.5 text-xs font-medium">{result.format}</span>
                                <p className="text-sm break-all">{result.text}</p>
                                <div className="flex flex-wrap gap-2">
                                    <CopyButton value={result.text} label="Copy" />
                                    {contentHref(result.text) && (
                                        <a
                                            href={contentHref(result.text) ?? '#'}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="text-primary text-sm underline"
                                        >
                                            Open
                                        </a>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
