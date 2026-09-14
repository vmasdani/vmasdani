import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateToTimestamps, nowTimestamps, parseTimestampInput } from '@/lib/timestamp';
import { ClockIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

interface Fields {
    seconds: number;
    milliseconds: number;
    iso: string;
    local: string;
    utc: string;
}

export default function TimestampTool() {
    const [input, setInput] = useState('');
    const [now, setNow] = useState<ReturnType<typeof nowTimestamps> | null>(null);

    useEffect(() => {
        setNow(nowTimestamps());

        const id = window.setInterval(() => setNow(nowTimestamps()), 1000);

        return () => window.clearInterval(id);
    }, []);

    const nowFields = useMemo<Fields | null>(() => (now === null ? null : fieldsFor(new Date(now.milliseconds))), [now]);

    const { fields, error } = useMemo(() => {
        const trimmed = input.trim();

        if (trimmed === '') {
            return { fields: null as Fields | null, error: null as string | null };
        }

        const date = parseTimestampInput(trimmed);

        if (date === null) {
            return { fields: null, error: 'Could not understand that value. Use a Unix timestamp or a date string.' };
        }

        return { fields: fieldsFor(date), error: null };
    }, [input]);

    return (
        <ToolPage slug="timestamp">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <ClockIcon className="size-4" />
                        Current time
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {nowFields === null ? <div className="bg-muted/40 h-40 animate-pulse" /> : renderFields(nowFields)}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="timestamp-input">Convert a timestamp or date</Label>
                        <div className="flex flex-wrap gap-2">
                            <Input
                                id="timestamp-input"
                                value={input}
                                spellCheck={false}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder="1700000000 or 2023-11-14T22:13:20Z"
                                className="h-10 flex-1 font-mono"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => now !== null && setInput(String(now.seconds))}
                                disabled={now === null}
                            >
                                Use now
                            </Button>
                        </div>
                    </div>

                    {error && <p className="text-destructive text-sm">{error}</p>}

                    {fields !== null && renderFields(fields)}
                </CardContent>
            </Card>

            <p className="text-muted-foreground text-xs">
                A value of 1,000,000,000,000 or larger is treated as milliseconds; smaller values as seconds.
            </p>
        </ToolPage>
    );
}

function fieldsFor(date: Date): Fields {
    const { seconds, milliseconds } = dateToTimestamps(date);

    return {
        seconds,
        milliseconds,
        iso: date.toISOString(),
        local: date.toLocaleString(),
        utc: date.toUTCString(),
    };
}

function renderFields(fields: Fields) {
    const rows: { label: string; value: string }[] = [
        { label: 'Unix seconds', value: String(fields.seconds) },
        { label: 'Unix milliseconds', value: String(fields.milliseconds) },
        { label: 'ISO 8601', value: fields.iso },
        { label: 'Local time', value: fields.local },
        { label: 'UTC', value: fields.utc },
    ];

    return (
        <div className="divide-border divide-y">
            {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                        <div className="text-muted-foreground text-xs">{row.label}</div>
                        <div className="truncate font-mono text-sm">{row.value}</div>
                    </div>
                    <CopyButton value={row.value} />
                </div>
            ))}
        </div>
    );
}
