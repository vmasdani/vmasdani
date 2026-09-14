import Seo from '@/components/seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SiteLayout from '@/layouts/site-layout';
import { useSpeedtest, type SpeedtestPhase } from '@/lib/speedtest';
import { WarningOctagonIcon } from '@phosphor-icons/react';

const GAUGE_RADIUS = 92;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/** Map 0 -> 1000 Mbps onto a log scale so slow and fast links both animate well. */
function speedFraction(mbps: number): number {
    if (!Number.isFinite(mbps) || mbps <= 0) {
        return 0;
    }

    return Math.min(1, Math.log10(mbps + 1) / 3);
}

function formatSpeed(mbps: number): string {
    if (!Number.isFinite(mbps) || mbps <= 0) {
        return '0';
    }

    if (mbps < 10) {
        return mbps.toFixed(2);
    }

    if (mbps < 100) {
        return mbps.toFixed(1);
    }

    return Math.round(mbps).toLocaleString();
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 kB';
    }

    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

function phaseLabel(phase: SpeedtestPhase): string {
    return (
        {
            idle: 'Ready',
            ping: 'Checking latency',
            download: 'Testing download',
            upload: 'Testing upload',
            done: 'Complete',
            error: 'Failed',
        }[phase] ?? ''
    );
}

export default function SpeedtestTool() {
    const { snapshot, start, stop, isRunning } = useSpeedtest();

    return (
        <SiteLayout>
            <Seo
                title="Internet Speed Test"
                description="Measure your download, upload, latency and jitter in the browser against Cloudflare. No apps, no sign-up, nothing stored."
            />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Internet Speed Test</h1>
                    <p className="text-muted-foreground text-sm">
                        Measure your connection straight from your browser against Cloudflare&apos;s speed endpoints, so it reflects your link, not
                        our server.
                    </p>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center gap-6 py-8">
                        <SpeedGauge mbps={snapshot.mbps} phase={snapshot.phase} />

                        {isRunning && (
                            <div className="bg-muted h-1 w-full max-w-sm overflow-hidden rounded-full">
                                <div
                                    className="bg-primary h-full transition-[width] duration-200 ease-out"
                                    style={{ width: `${Math.round(snapshot.progress * 100)}%` }}
                                />
                            </div>
                        )}

                        <Sparkline samples={snapshot.samples} />

                        <Button onClick={isRunning ? stop : start} variant={isRunning ? 'outline' : 'default'} className="min-w-32">
                            {isRunning ? 'Stop' : snapshot.phase === 'done' || snapshot.phase === 'error' ? 'Test again' : 'Start test'}
                        </Button>
                    </CardContent>
                </Card>

                {snapshot.phase === 'error' && snapshot.error && (
                    <Alert variant="destructive">
                        <WarningOctagonIcon />
                        <AlertTitle>Test failed</AlertTitle>
                        <AlertDescription>{snapshot.error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Metric label="Download" value={snapshot.download !== null ? `${formatSpeed(snapshot.download)} Mbps` : '—'} />
                    <Metric label="Upload" value={snapshot.upload !== null ? `${formatSpeed(snapshot.upload)} Mbps` : '—'} />
                    <Metric label="Latency" value={snapshot.latency !== null ? `${snapshot.latency.toFixed(0)} ms` : '—'} />
                    <Metric label="Jitter" value={snapshot.jitter !== null ? `${snapshot.jitter.toFixed(0)} ms` : '—'} />
                    <Metric label="Server" value={snapshot.server ?? 'Cloudflare'} />
                    <Metric label="Data used" value={`${formatBytes(snapshot.bytesDown)} ↓ / ${formatBytes(snapshot.bytesUp)} ↑`} />
                </div>

                <p className="text-muted-foreground text-xs">
                    The test runs entirely in your browser. Only the transfer itself reaches Cloudflare; nothing is sent to or stored on this server.
                </p>
            </div>
        </SiteLayout>
    );
}

function SpeedGauge({ mbps, phase }: { mbps: number; phase: SpeedtestPhase }) {
    const fraction = speedFraction(mbps);

    return (
        <div className="relative size-56 sm:size-64">
            <svg viewBox="0 0 220 220" className="size-full -rotate-90">
                <circle cx="110" cy="110" r={GAUGE_RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
                <circle
                    cx="110"
                    cy="110"
                    r={GAUGE_RADIUS}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={GAUGE_CIRCUMFERENCE}
                    strokeDashoffset={GAUGE_CIRCUMFERENCE * (1 - fraction)}
                    className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"
                />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{formatSpeed(mbps)}</span>
                <span className="text-muted-foreground text-sm">Mbps</span>
                <span className="text-muted-foreground mt-2 text-xs font-medium tracking-wide uppercase">{phaseLabel(phase)}</span>
            </div>
        </div>
    );
}

function Sparkline({ samples }: { samples: number[] }) {
    if (samples.length < 2) {
        return <div className="h-12 w-full max-w-md rounded-md border border-dashed" aria-hidden />;
    }

    const max = Math.max(...samples, 1);
    const points = samples
        .map((value, index) => {
            const x = (index / (samples.length - 1)) * 100;
            const y = 30 - (value / max) * 28;

            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="text-primary h-12 w-full max-w-md" role="img" aria-label="Live speed samples">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
        </div>
    );
}
