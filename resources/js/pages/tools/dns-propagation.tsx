import ToolPage from '@/components/tool-page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DNS_RECORD_TYPES,
    DNS_RESOLVERS,
    answerKey,
    checkPropagation,
    summarize,
    type DnsRecordType,
    type PropagationOutcome,
    type ResolverResult,
} from '@/lib/dns-propagation';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';

export default function DnsPropagationTool() {
    const [name, setName] = useState('example.com');
    const [recordType, setRecordType] = useState<DnsRecordType>('A');
    const [loading, setLoading] = useState(false);
    const [outcome, setOutcome] = useState<PropagationOutcome | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const query = name.trim();

        if (query === '') {
            setFailure('Enter a domain to check.');

            return;
        }

        setLoading(true);
        setFailure(null);
        setOutcome(null);

        try {
            const results = await checkPropagation(query, recordType);

            setOutcome(summarize(results, recordType));
        } catch {
            setFailure('Could not run the check. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const consensusKey = outcome ? answerKey(recordType, outcome.consensus) : '';

    return (
        <ToolPage slug="dns-propagation">
            <div className="space-y-4">
                <form onSubmit={submit}>
                    <Card>
                        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="dns-name">Domain</Label>
                                <Input
                                    id="dns-name"
                                    value={name}
                                    spellCheck={false}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="example.com"
                                    className="font-mono"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dns-type">Record type</Label>
                                <Select value={recordType} onValueChange={(value) => setRecordType(value as DnsRecordType)}>
                                    <SelectTrigger id="dns-type" className="w-full sm:w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DNS_RECORD_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" disabled={loading}>
                                {loading ? 'Checking...' : 'Check propagation'}
                            </Button>
                        </CardContent>
                    </Card>
                </form>

                {failure && (
                    <Alert variant="destructive">
                        <WarningCircleIcon />
                        <AlertTitle>Could not check</AlertTitle>
                        <AlertDescription>{failure}</AlertDescription>
                    </Alert>
                )}

                {loading && (
                    <Card>
                        <CardContent className="space-y-3">
                            {DNS_RESOLVERS.map((resolver) => (
                                <Skeleton key={resolver.id} className="h-12 w-full" />
                            ))}
                        </CardContent>
                    </Card>
                )}

                {outcome && !loading && (
                    <div className="space-y-4">
                        <Alert variant={outcome.propagated ? 'success' : 'default'}>
                            {outcome.propagated ? <CheckCircleIcon /> : <WarningCircleIcon />}
                            <AlertTitle>
                                {outcome.propagated ? 'Fully propagated' : outcome.answered === 0 ? 'No answers' : 'Not fully propagated'}
                            </AlertTitle>
                            <AlertDescription className="space-y-1">
                                <span className="block">
                                    {outcome.propagated
                                        ? `All ${outcome.answered} resolvers returned the same records.`
                                        : outcome.answered === 0
                                          ? 'None of the resolvers returned records for this name.'
                                          : `${outcome.consensusCount} of ${outcome.answered} resolvers agree; ${outcome.distinct} distinct answer sets.`}
                                </span>
                                {outcome.consensus.length > 0 && (
                                    <span className="block font-mono text-xs break-all">{outcome.consensus.join(', ')}</span>
                                )}
                            </AlertDescription>
                        </Alert>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Resolver</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>{recordType} records</TableHead>
                                            <TableHead className="text-right">Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outcome.results.map((result) => (
                                            <TableRow key={result.id}>
                                                <TableCell className="align-top">
                                                    <div className="font-medium">{result.name}</div>
                                                    <div className="text-muted-foreground text-xs">{result.location}</div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <StatusBadge
                                                        result={result}
                                                        matches={result.status === 'ok' && answerKey(recordType, result.answers) === consensusKey}
                                                    />
                                                </TableCell>
                                                <TableCell className="align-top font-mono text-xs">
                                                    {result.status === 'ok' ? (
                                                        <ul className="space-y-0.5">
                                                            {result.answers.map((answer) => (
                                                                <li key={answer} className="break-all">
                                                                    {answer}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-muted-foreground">{result.message}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-right align-top text-xs tabular-nums">
                                                    {result.durationMs} ms
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <p className="text-muted-foreground text-xs">
                    Queries run in your browser against public DNS-over-HTTPS resolvers. Results reflect each resolver&apos;s cache, so a recent
                    change can take up to the record&apos;s TTL to appear everywhere. Only resolvers that allow browser requests are included.
                </p>
            </div>
        </ToolPage>
    );
}

function StatusBadge({ result, matches }: { result: ResolverResult; matches: boolean }) {
    if (result.status === 'ok') {
        return matches ? (
            <Badge variant="outline" className="border-green-600/40 text-green-700 dark:text-green-500">
                Match
            </Badge>
        ) : (
            <Badge variant="destructive">Different</Badge>
        );
    }

    if (result.status === 'empty') {
        return <Badge variant="outline">No records</Badge>;
    }

    return <Badge variant="destructive">Error</Badge>;
}
