import Seo from '@/components/seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SiteLayout from '@/layouts/site-layout';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';

interface IpResponse {
    ok: boolean;
    ip: string | null;
    local?: boolean;
    country: string | null;
    countryCode: string | null;
    region?: string | null;
    city: string | null;
    isp: string | null;
    note?: string;
    error?: string;
}

export default function IpTool() {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<IpResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailure(null);

        try {
            const response = await fetch(route('tools.ip.info'), { headers: { Accept: 'application/json' } });
            setResult((await response.json()) as IpResponse);
        } catch {
            setResult(null);
            setFailure('Could not reach the server. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <SiteLayout>
            <Seo title="Check My IP" description="See the public IP address, country, city and ISP this site sees for your connection." />

            <div className="space-y-6">
                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Check My IP &amp; Country</h1>
                        <p className="text-muted-foreground text-sm">The public address and location the server sees for this visit.</p>
                    </div>
                    <Button variant="outline" onClick={load} disabled={loading}>
                        {loading ? 'Checking...' : 'Refresh'}
                    </Button>
                </div>

                {failure && (
                    <Alert variant="destructive">
                        <WarningOctagonIcon />
                        <AlertTitle>Request failed</AlertTitle>
                        <AlertDescription>{failure}</AlertDescription>
                    </Alert>
                )}

                {result && !result.ok && (
                    <Alert variant="destructive">
                        <WarningOctagonIcon />
                        <AlertTitle>Unavailable</AlertTitle>
                        <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                )}

                {result?.ok && (
                    <>
                        <div className="rounded-lg border p-6 text-center">
                            <div className="text-muted-foreground text-xs tracking-wide uppercase">Your IP address</div>
                            <div className="mt-2 text-3xl font-semibold tabular-nums">{result.ip}</div>
                            {result.country && (
                                <div className="text-muted-foreground mt-2 text-sm">
                                    {result.city ? `${result.city}, ` : ''}
                                    {result.region ? `${result.region}, ` : ''}
                                    {result.country} {result.countryCode ? `(${result.countryCode})` : ''}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Fact label="Country" value={result.country} />
                            <Fact label="Region" value={result.region ?? null} />
                            <Fact label="City" value={result.city} />
                            <Fact label="ISP" value={result.isp} />
                        </div>

                        {result.note && <p className="text-muted-foreground text-sm">{result.note}</p>}
                    </>
                )}
            </div>
        </SiteLayout>
    );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
    return (
        <Card>
            <CardContent>
                <div className="text-muted-foreground text-xs">{label}</div>
                <div className="mt-1 font-medium">{value && value !== '' ? value : '—'}</div>
            </CardContent>
        </Card>
    );
}
