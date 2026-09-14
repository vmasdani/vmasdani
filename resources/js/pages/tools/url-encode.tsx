import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { decodeUrl, encodeUrl, type UrlEncodeMode } from '@/lib/url-codec';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

type Mode = 'encode' | 'decode';

export default function UrlEncodeTool() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<Mode>('encode');
    const [encodeMode, setEncodeMode] = useState<UrlEncodeMode>('component');

    const { output, error } = useMemo(() => {
        if (input === '') {
            return { output: '', error: null as string | null };
        }

        try {
            return {
                output: mode === 'encode' ? encodeUrl(input, encodeMode) : decodeUrl(input),
                error: null as string | null,
            };
        } catch (exception) {
            return { output: '', error: exception instanceof Error ? exception.message : 'Could not process the input.' };
        }
    }, [input, mode, encodeMode]);

    return (
        <ToolPage slug="url-encode">
            <Card>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                            <TabsList>
                                <TabsTrigger value="encode">Encode</TabsTrigger>
                                <TabsTrigger value="decode">Decode</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-3">
                            {mode === 'encode' && (
                                <Select value={encodeMode} onValueChange={(value) => setEncodeMode(value as UrlEncodeMode)}>
                                    <SelectTrigger className="w-44" aria-label="Encoding scope">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="component">Component / query</SelectItem>
                                        <SelectItem value="full">Full URL</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (output === '' || error !== null) {
                                        return;
                                    }
                                    setInput(output);
                                    setMode((current) => (current === 'encode' ? 'decode' : 'encode'));
                                }}
                                disabled={output === '' || error !== null}
                            >
                                <ArrowsLeftRightIcon />
                                Swap
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="url-input">{mode === 'encode' ? 'Plain text / URL' : 'Encoded text'}</Label>
                            <Textarea
                                id="url-input"
                                value={input}
                                spellCheck={false}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder={mode === 'encode' ? 'Type or paste text to encode' : 'Paste percent-encoded text'}
                                className="min-h-48 font-mono"
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="url-output">{mode === 'encode' ? 'Encoded' : 'Decoded'}</Label>
                                <CopyButton value={output} />
                            </div>
                            <Textarea
                                id="url-output"
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
