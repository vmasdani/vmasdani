import Seo from '@/components/seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SiteLayout from '@/layouts/site-layout';
import { fetchToolJson } from '@/lib/tool-request';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';

interface PingResponse {
    ok: boolean;
    host: string;
    resolved: string | null;
    output: string;
    packets: { transmitted: number; received: number; percentLoss: string | null };
    timing: { min: string; avg: string; max: string; mdev: string } | null;
    error: string | null;
}

function isPingResult(data: unknown): data is PingResponse {
    const value = data as Partial<PingResponse>;

    return typeof value?.ok === 'boolean' && typeof value?.host === 'string' && typeof value?.packets === 'object' && value.packets !== null;
}

export default function PingTool() {
    const [host, setHost] = useState('1.1.1.1');
    const [count, setCount] = useState('4');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PingResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setFailure(null);

        const { data, failure: error } = await fetchToolJson(route('tools.ping.run', { host, count }), isPingResult);

        setResult(data);
        setFailure(error);
        setLoading(false);
    };

    return (
        <SiteLayout>
            <Seo title="Ping" description="Ping any host from the server and inspect latency, packet loss and round-trip statistics." />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Online Ping</h1>
                    <p className="text-muted-foreground text-sm">Send ICMP echo requests from the server and inspect latency and packet loss.</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="host">Host</Label>
                                <Input id="host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="count">Count</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    min={1}
                                    max={4}
                                    value={count}
                                    onChange={(event) => setCount(event.target.value)}
                                    className="w-24"
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Pinging...' : 'Ping'}
                            </Button>
                        </CardContent>
                    </Card>
                </form>

                {failure && (
                    <Alert variant="destructive">
                        <WarningOctagonIcon />
                        <AlertTitle>Request failed</AlertTitle>
                        <AlertDescription>{failure}</AlertDescription>
                    </Alert>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={result.ok ? 'default' : 'destructive'}>{result.ok ? 'Reachable' : 'Unreachable'}</Badge>
                            <span className="text-sm">
                                <span className="font-medium">{result.host}</span>
                                {result.resolved && <span className="text-muted-foreground"> ({result.resolved})</span>}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Metric label="Transmitted" value={String(result.packets.transmitted)} />
                            <Metric label="Received" value={String(result.packets.received)} />
                            <Metric label="Loss" value={result.packets.percentLoss !== null ? `${result.packets.percentLoss}%` : '—'} />
                            <Metric label="Avg RTT" value={result.timing ? `${result.timing.avg} ms` : '—'} />
                        </div>

                        {result.output && (
                            <pre className="bg-muted/50 text-foreground overflow-x-auto rounded-md border p-4 text-xs/relaxed">
                                <code>{result.output}</code>
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </SiteLayout>
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
