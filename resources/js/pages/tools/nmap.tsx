import Seo from '@/components/seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SiteLayout from '@/layouts/site-layout';
import { fetchToolJson } from '@/lib/tool-request';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';

interface NmapPort {
    port: string;
    protocol: string;
    state: string;
    service: string;
}

interface NmapResponse {
    ok: boolean;
    host: string;
    output: string;
    ports: NmapPort[];
    error: string | null;
}

function isNmapResult(data: unknown): data is NmapResponse {
    const value = data as Partial<NmapResponse>;

    return typeof value?.ok === 'boolean' && typeof value?.host === 'string' && Array.isArray(value?.ports);
}

export default function NmapTool() {
    const [host, setHost] = useState('scanme.nmap.org');
    const [ports, setPorts] = useState('');
    const [scan, setScan] = useState('tcp');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<NmapResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setFailure(null);

        const params: Record<string, string> = { host, scan };
        if (ports.trim() !== '') {
            params.ports = ports.trim();
        }

        const { data, failure: error } = await fetchToolJson(`${route('tools.nmap.run')}?${new URLSearchParams(params).toString()}`, isNmapResult);

        setResult(data);
        setFailure(error);
        setLoading(false);
    };

    const openPorts = result?.ports.filter((port) => port.state === 'open') ?? [];

    return (
        <SiteLayout>
            <Seo
                title="Port Scanner"
                description="Scan a host for open TCP ports with a pure-PHP connect scan and service banner grabbing. No binaries, no sign-up."
            />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Port Scanner</h1>
                    <p className="text-muted-foreground text-sm">
                        Pure-PHP TCP connect scan with optional banner grabbing — no nmap binary needed. Bounded by timeouts.
                    </p>
                </div>

                <Alert>
                    <WarningOctagonIcon />
                    <AlertTitle>Use responsibly</AlertTitle>
                    <AlertDescription>Only scan hosts you own or have permission to test. Abuse will be reported.</AlertDescription>
                </Alert>

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="host">Host</Label>
                                <Input id="host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ports">Ports</Label>
                                <Input
                                    id="ports"
                                    value={ports}
                                    onChange={(event) => setPorts(event.target.value)}
                                    placeholder="top 20 (default)"
                                    className="w-36"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="scan">Scan</Label>
                                <Select value={scan} onValueChange={setScan}>
                                    <SelectTrigger id="scan" className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tcp">TCP connect</SelectItem>
                                        <SelectItem value="syn">SYN (connect fallback)</SelectItem>
                                        <SelectItem value="version">Version (banners)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Scanning...' : 'Scan'}
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
                        <div className="flex items-center gap-2">
                            <Badge variant={openPorts.length > 0 ? 'default' : 'secondary'}>
                                {openPorts.length} open {openPorts.length === 1 ? 'port' : 'ports'}
                            </Badge>
                            <span className="text-sm font-medium">{result.host}</span>
                        </div>

                        {result.ports.length > 0 && (
                            <Card>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground border-b text-left text-xs">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Port</th>
                                                <th className="px-4 py-2 font-medium">State</th>
                                                <th className="px-4 py-2 font-medium">Service</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.ports.map((port) => (
                                                <tr key={`${port.port}/${port.protocol}`} className="border-b last:border-0">
                                                    <td className="px-4 py-2 tabular-nums">
                                                        {port.port}/{port.protocol}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span
                                                            className={port.state === 'open' ? 'font-medium text-green-600' : 'text-muted-foreground'}
                                                        >
                                                            {port.state}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">{port.service}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}

                        {result.error && <p className="text-destructive text-sm">{result.error}</p>}

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
