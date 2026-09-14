import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateIdentifiers, type IdentifierKind } from '@/lib/identifiers';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

export default function UuidTool() {
    const [kind, setKind] = useState<IdentifierKind>('uuid-v4');
    const [count, setCount] = useState(10);
    const [uppercase, setUppercase] = useState(false);
    const [values, setValues] = useState<string[]>([]);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setValues(generateIdentifiers(kind, count, uppercase));
    }, [kind, count, uppercase, attempt]);

    const output = values.join('\n');

    return (
        <ToolPage slug="uuid">
            <Card>
                <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <div className="grid gap-2">
                        <Label htmlFor="uuid-kind">Type</Label>
                        <Select value={kind} onValueChange={(value) => setKind(value as IdentifierKind)}>
                            <SelectTrigger id="uuid-kind" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="uuid-v4">UUID v4 (random)</SelectItem>
                                <SelectItem value="uuid-v7">UUID v7 (time-ordered)</SelectItem>
                                <SelectItem value="ulid">ULID (time-ordered)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="uuid-count">How many</Label>
                        <Input
                            id="uuid-count"
                            type="number"
                            min={1}
                            max={500}
                            value={count}
                            onChange={(event) => setCount(Number(event.target.value))}
                            className="w-28"
                        />
                    </div>

                    <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                        <ArrowsClockwiseIcon />
                        Generate
                    </Button>

                    <label className="flex items-center gap-2 text-sm sm:col-span-3">
                        <Checkbox checked={uppercase} onCheckedChange={(checked) => setUppercase(checked === true)} />
                        Uppercase output
                    </label>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="uuid-output">Result</Label>
                        <CopyButton value={output} />
                    </div>
                    <Textarea id="uuid-output" value={output} readOnly spellCheck={false} className="min-h-48 font-mono" />
                </CardContent>
            </Card>

            <p className="text-muted-foreground text-xs">
                Generated locally with your browser&apos;s secure random number generator. UUID v7 and ULID sort by creation time.
            </p>
        </ToolPage>
    );
}
