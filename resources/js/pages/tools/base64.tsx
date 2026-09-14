import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/ui/copy-button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { decodeBase64, encodeBase64 } from '@/lib/base64';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

type Mode = 'encode' | 'decode';

export default function Base64Tool() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<Mode>('encode');
    const [urlSafe, setUrlSafe] = useState(false);

    const { output, error } = useMemo(() => {
        if (input === '') {
            return { output: '', error: null as string | null };
        }

        try {
            return {
                output: mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input),
                error: null as string | null,
            };
        } catch (exception) {
            return { output: '', error: exception instanceof Error ? exception.message : 'Could not process the input.' };
        }
    }, [input, mode, urlSafe]);

    const swap = () => {
        if (output === '' || error !== null) {
            return;
        }

        setInput(output);
        setMode((current) => (current === 'encode' ? 'decode' : 'encode'));
    };

    return (
        <ToolPage slug="base64">
            <Card>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                            <TabsList>
                                <TabsTrigger value="encode">Encode</TabsTrigger>
                                <TabsTrigger value="decode">Decode</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-4">
                            {mode === 'encode' && (
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={urlSafe} onCheckedChange={(checked) => setUrlSafe(checked === true)} />
                                    URL-safe
                                </label>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={swap} disabled={output === '' || error !== null}>
                                <ArrowsLeftRightIcon />
                                Swap
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setInput('')} disabled={input === ''}>
                                Clear
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="base64-input">{mode === 'encode' ? 'Plain text' : 'Base64'}</Label>
                            <Textarea
                                id="base64-input"
                                value={input}
                                spellCheck={false}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder={mode === 'encode' ? 'Type or paste text to encode' : 'Paste Base64 to decode'}
                                className="min-h-48 font-mono"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="base64-output">{mode === 'encode' ? 'Base64' : 'Plain text'}</Label>
                                <CopyButton value={output} />
                            </div>
                            <Textarea
                                id="base64-output"
                                value={error ?? output}
                                readOnly
                                aria-invalid={error !== null}
                                placeholder="Result appears here"
                                className="min-h-48 font-mono"
                            />
                        </div>
                    </div>

                    {error && <p className="text-destructive text-sm">{error}</p>}
                </CardContent>
            </Card>
        </ToolPage>
    );
}
