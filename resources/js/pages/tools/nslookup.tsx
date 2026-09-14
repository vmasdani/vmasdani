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

interface NslookupResponse {
    ok: boolean;
    host: string;
    server: string | null;
    addresses: string[];
    output: string;
    error: string | null;
}

function isNslookupResult(data: unknown): data is NslookupResponse {
    const value = data as Partial<NslookupResponse>;

    return typeof value?.ok === 'boolean' && typeof value?.host === 'string' && Array.isArray(value?.addresses);
}

export default function NslookupTool() {
    const [host, setHost] = useState('example.com');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<NslookupResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setFailure(null);

        const { data, failure: error } = await fetchToolJson(
            `${route('tools.nslookup.run')}?${new URLSearchParams({ host }).toString()}`,
            isNslookupResult,
        );

        setResult(data);
        setFailure(error);
        setLoading(false);
    };

    return (
        <SiteLayout>
            <Seo title="DNS Lookup" description="Resolve any hostname through the server's DNS resolver and inspect the returned addresses." />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Online Nslookup</h1>
                    <p className="text-muted-foreground text-sm">
                        Resolve a hostname through the server&apos;s DNS resolver and inspect the raw answer.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="host">Host</Label>
                                <Input id="host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" required />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Looking up...' : 'Lookup'}
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
                            <Badge variant={result.ok ? 'default' : 'destructive'}>{result.ok ? 'Resolved' : 'Not resolved'}</Badge>
                            <span className="text-sm">
                                <span className="font-medium">{result.host}</span>
                                {result.server && <span className="text-muted-foreground"> via {result.server}</span>}
                            </span>
                        </div>

                        {result.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {result.addresses.map((address) => (
                                    <Badge key={address} variant="secondary" className="font-mono">
                                        {address}
                                    </Badge>
                                ))}
                            </div>
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
