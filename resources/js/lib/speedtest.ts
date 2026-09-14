import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeedtestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done' | 'error';

export interface SpeedtestSnapshot {
    phase: SpeedtestPhase;
    progress: number;
    mbps: number;
    samples: number[];
    latency: number | null;
    jitter: number | null;
    download: number | null;
    upload: number | null;
    bytesDown: number;
    bytesUp: number;
    server: string | null;
    error: string | null;
}

export const initialSpeedtestSnapshot: SpeedtestSnapshot = {
    phase: 'idle',
    progress: 0,
    mbps: 0,
    samples: [],
    latency: null,
    jitter: null,
    download: null,
    upload: null,
    bytesDown: 0,
    bytesUp: 0,
    server: null,
    error: null,
};

/**
 * Everything runs in the visitor's browser against Cloudflare's speed
 * endpoints, which are CORS-enabled. This measures the visitor's connection,
 * unlike a server-side probe which would only measure the hosting datacenter.
 */
const DOWNLOAD_ENDPOINT = 'https://speed.cloudflare.com/__down';
const UPLOAD_ENDPOINT = 'https://speed.cloudflare.com/__up';

const PING_SAMPLES = 6;

/** Graduate the payload sizes so slow links still finish and fast ones are pushed. */
const DOWNLOAD_SIZES = [100_000, 1_000_000, 5_000_000, 15_000_000, 25_000_000];
const UPLOAD_SIZES = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000];

const DOWNLOAD_BUDGET_MS = 10_000;
const UPLOAD_BUDGET_MS = 8_000;

/** Rolling window used to turn cumulative bytes into an instantaneous rate. */
const RATE_WINDOW_MS = 700;
const MAX_SAMPLES = 120;
const SAMPLE_INTERVAL_MS = 120;

type Patch = Partial<SpeedtestSnapshot>;

interface RateTracker {
    points: { t: number; bytes: number }[];
    push: (t: number, bytes: number) => number;
}

function rateTracker(): RateTracker {
    const points: { t: number; bytes: number }[] = [];

    return {
        points,
        push(t: number, bytes: number): number {
            points.push({ t, bytes });

            while (points.length > 2 && t - points[0].t > RATE_WINDOW_MS) {
                points.shift();
            }

            const first = points[0];
            const last = points[points.length - 1];
            const seconds = (last.t - first.t) / 1000;

            if (seconds <= 0) {
                return 0;
            }

            return ((last.bytes - first.bytes) * 8) / seconds / 1_000_000;
        },
    };
}

function describeServer(headers: Headers): string | null {
    const city = headers.get('cf-meta-city');
    const colo = headers.get('cf-meta-colo');

    if (city && colo) {
        return `${city} (${colo})`;
    }

    return city ?? colo;
}

function mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Time a handful of zero-byte downloads. The first request warms up DNS/TLS
 * so it does not skew the samples; jitter is the mean consecutive delta.
 */
async function measurePing(signal: AbortSignal): Promise<{ latency: number; jitter: number; server: string | null }> {
    const times: number[] = [];
    let server: string | null = null;

    const warmup = await fetch(`${DOWNLOAD_ENDPOINT}?bytes=0`, { cache: 'no-store', signal });
    await warmup.arrayBuffer();
    server ??= describeServer(warmup.headers);

    for (let i = 0; i < PING_SAMPLES; i++) {
        const started = performance.now();
        const response = await fetch(`${DOWNLOAD_ENDPOINT}?bytes=0&r=${Math.random()}`, { cache: 'no-store', signal });
        await response.arrayBuffer();

        times.push(performance.now() - started);
        server ??= describeServer(response.headers);
    }

    let jitter = 0;
    for (let i = 1; i < times.length; i++) {
        jitter += Math.abs(times[i] - times[i - 1]);
    }

    return {
        latency: mean(times),
        jitter: jitter / (times.length - 1),
        server,
    };
}

interface TransferHooks {
    onChange: (patch: Patch) => void;
    isCancelled: () => boolean;
    register: (xhr: XMLHttpRequest) => void;
}

function xhrDownload(url: string, onProgress: (loaded: number) => void, register: (xhr: XMLHttpRequest) => void): Promise<number> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        register(xhr);

        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';

        let loaded = 0;
        xhr.onprogress = (event) => {
            loaded = event.loaded;
            onProgress(event.loaded);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(loaded) : reject(new Error(`Download failed (HTTP ${xhr.status}).`)));
        xhr.onerror = () => reject(new Error('Download failed. Check your connection.'));
        xhr.onabort = () => resolve(loaded);
        xhr.send();
    });
}

function xhrUpload(url: string, size: number, onProgress: (loaded: number) => void, register: (xhr: XMLHttpRequest) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        register(xhr);

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'text/plain');

        xhr.upload.onprogress = (event) => {
            onProgress(event.loaded);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (HTTP ${xhr.status}).`)));
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
        xhr.onabort = () => resolve();

        xhr.send(new Blob([new Uint8Array(size)], { type: 'text/plain' }));
    });
}

async function measureDownload({ onChange, isCancelled, register }: TransferHooks): Promise<{ mbps: number; bytes: number }> {
    const started = performance.now();
    const rate = rateTracker();
    const samples: number[] = [];
    let total = 0;
    let lastSample = 0;

    for (const size of DOWNLOAD_SIZES) {
        if (isCancelled() || performance.now() - started > DOWNLOAD_BUDGET_MS) {
            break;
        }

        const base = total;

        total =
            base +
            (await xhrDownload(
                `${DOWNLOAD_ENDPOINT}?bytes=${size}&r=${Math.random()}`,
                (loaded) => {
                    const now = performance.now();
                    total = base + loaded;
                    const mbps = rate.push(now, total);

                    if (mbps > 0 && now - lastSample >= SAMPLE_INTERVAL_MS) {
                        lastSample = now;
                        samples.push(mbps);
                        if (samples.length > MAX_SAMPLES) {
                            samples.shift();
                        }
                    }

                    onChange({ mbps, bytesDown: total, samples: [...samples], progress: Math.min(1, (now - started) / DOWNLOAD_BUDGET_MS) });
                },
                register,
            ));
    }

    const seconds = (performance.now() - started) / 1000;

    return { mbps: seconds > 0 ? (total * 8) / seconds / 1_000_000 : 0, bytes: total };
}

async function measureUpload({ onChange, isCancelled, register }: TransferHooks): Promise<{ mbps: number; bytes: number }> {
    const started = performance.now();
    const rate = rateTracker();
    const samples: number[] = [];
    let total = 0;
    let lastSample = 0;

    for (const size of UPLOAD_SIZES) {
        if (isCancelled() || performance.now() - started > UPLOAD_BUDGET_MS) {
            break;
        }

        const base = total;

        await xhrUpload(
            `${UPLOAD_ENDPOINT}?r=${Math.random()}`,
            size,
            (loaded) => {
                const now = performance.now();
                total = base + loaded;
                const mbps = rate.push(now, total);

                if (mbps > 0 && now - lastSample >= SAMPLE_INTERVAL_MS) {
                    lastSample = now;
                    samples.push(mbps);
                    if (samples.length > MAX_SAMPLES) {
                        samples.shift();
                    }
                }

                onChange({ mbps, bytesUp: total, samples: [...samples], progress: Math.min(1, (now - started) / UPLOAD_BUDGET_MS) });
            },
            register,
        );

        total = base + size;
    }

    const seconds = (performance.now() - started) / 1000;

    return { mbps: seconds > 0 ? (total * 8) / seconds / 1_000_000 : 0, bytes: total };
}

/**
 * Run the full test. Returns a cancel function; callbacks receive partial
 * snapshot updates so the UI can animate while the test is running.
 */
export function runSpeedtest(onChange: (patch: Patch) => void): () => void {
    let cancelled = false;
    const controller = new AbortController();
    const xhrs = new Set<XMLHttpRequest>();

    const register = (xhr: XMLHttpRequest) => {
        xhrs.add(xhr);
        xhr.addEventListener('loadend', () => xhrs.delete(xhr));
    };

    const cancel = () => {
        cancelled = true;
        controller.abort();
        xhrs.forEach((xhr) => xhr.abort());
        xhrs.clear();
    };

    void (async () => {
        try {
            onChange({
                phase: 'ping',
                progress: 0,
                mbps: 0,
                samples: [],
                latency: null,
                jitter: null,
                download: null,
                upload: null,
                bytesDown: 0,
                bytesUp: 0,
                server: null,
                error: null,
            });

            const ping = await measurePing(controller.signal);
            if (cancelled) {
                return;
            }

            onChange({ latency: ping.latency, jitter: ping.jitter, server: ping.server, phase: 'download', progress: 0, mbps: 0, samples: [] });

            const download = await measureDownload({ onChange, isCancelled: () => cancelled, register });
            if (cancelled) {
                return;
            }

            onChange({ download: download.mbps, bytesDown: download.bytes, phase: 'upload', progress: 0, mbps: 0, samples: [] });

            const upload = await measureUpload({ onChange, isCancelled: () => cancelled, register });
            if (cancelled) {
                return;
            }

            onChange({ upload: upload.mbps, bytesUp: upload.bytes, phase: 'done', progress: 1, mbps: download.mbps });
        } catch (error) {
            if (cancelled) {
                return;
            }

            onChange({ phase: 'error', error: error instanceof Error ? error.message : 'The speed test failed.' });
        }
    })();

    return cancel;
}

export function useSpeedtest() {
    const [snapshot, setSnapshot] = useState<SpeedtestSnapshot>(initialSpeedtestSnapshot);
    const cancelRef = useRef<(() => void) | null>(null);

    const start = useCallback(() => {
        cancelRef.current?.();
        setSnapshot({ ...initialSpeedtestSnapshot, phase: 'ping' });
        cancelRef.current = runSpeedtest((patch) => setSnapshot((current) => ({ ...current, ...patch })));
    }, []);

    const stop = useCallback(() => {
        cancelRef.current?.();
        cancelRef.current = null;
        setSnapshot((current) => ({ ...current, phase: 'idle', mbps: 0, progress: 0 }));
    }, []);

    useEffect(() => () => cancelRef.current?.(), []);

    const isRunning = snapshot.phase === 'ping' || snapshot.phase === 'download' || snapshot.phase === 'upload';

    return { snapshot, start, stop, isRunning };
}
