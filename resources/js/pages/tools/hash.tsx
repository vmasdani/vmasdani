import ToolPage from '@/components/tool-page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HASH_ALGORITHMS, hashAll, type HashAlgorithm } from '@/lib/hash';
import { CheckCircleIcon, WarningOctagonIcon, XCircleIcon } from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';

type PasswordHashAlgorithm = 'bcrypt' | 'argon2i' | 'argon2id';

const PASSWORD_HASH_ALGORITHMS: { value: PasswordHashAlgorithm; label: string }[] = [
    { value: 'bcrypt', label: 'bcrypt' },
    { value: 'argon2i', label: 'Argon2i' },
    { value: 'argon2id', label: 'Argon2id' },
];

interface GenerateResponse {
    ok: boolean;
    hash: string | null;
    algorithm: string;
    error: string | null;
}

interface VerifyResponse {
    ok: boolean;
    matches: boolean;
    algorithm: string;
    detected: string | null;
    error: string | null;
}

function isGenerateResponse(data: unknown): data is GenerateResponse {
    const value = data as Partial<GenerateResponse>;

    return typeof value?.ok === 'boolean' && (typeof value?.hash === 'string' || value?.hash === null);
}

function isVerifyResponse(data: unknown): data is VerifyResponse {
    const value = data as Partial<VerifyResponse>;

    return typeof value?.ok === 'boolean' && typeof value?.matches === 'boolean';
}

export default function HashTool() {
    const [input, setInput] = useState('');
    const [hashes, setHashes] = useState<Record<HashAlgorithm, string> | null>(null);
    const [algorithm, setAlgorithm] = useState<PasswordHashAlgorithm>('bcrypt');
    const [generatePassword, setGeneratePassword] = useState('');
    const [generatedHash, setGeneratedHash] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [hash, setHash] = useState('');
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState<VerifyResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    useEffect(() => {
        if (input === '') {
            setHashes(null);

            return;
        }

        let active = true;

        void hashAll(input).then((result) => {
            if (active) {
                setHashes(result);
            }
        });

        return () => {
            active = false;
        };
    }, [input]);

    const generate = async (event: FormEvent) => {
        event.preventDefault();
        setGenerating(true);
        setGenerateError(null);

        try {
            const response = await fetch(route('tools.hash.generate'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ algorithm, password: generatePassword }),
            });
            const data: unknown = await response.json().catch(() => null);

            if (isGenerateResponse(data) && data.ok && data.hash !== null) {
                setGeneratedHash(data.hash);
            } else {
                setGenerateError(errorMessage(data, 'The server could not generate a hash.'));
            }
        } catch {
            setGenerateError('Could not reach the server. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const verify = async (event: FormEvent) => {
        event.preventDefault();
        setVerifying(true);
        setFailure(null);
        setResult(null);

        try {
            const response = await fetch(route('tools.hash.verify'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ algorithm, hash, password }),
            });
            const data: unknown = await response.json().catch(() => null);

            if (isVerifyResponse(data)) {
                setResult(data);
            } else {
                setFailure(errorMessage(data, 'The server returned an unexpected response.'));
            }
        } catch {
            setFailure('Could not reach the server. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <ToolPage slug="hash">
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                    <Card>
                        <CardContent className="grid gap-2">
                            <Label htmlFor="hash-input">Text</Label>
                            <Textarea
                                id="hash-input"
                                value={input}
                                spellCheck={false}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder="Type or paste text to hash"
                                className="min-h-32 font-mono"
                            />
                        </CardContent>
                    </Card>

                    {HASH_ALGORITHMS.map((name) => (
                        <Card key={name}>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{name}</span>
                                    <CopyButton value={hashes?.[name] ?? ''} />
                                </div>
                                <code className="bg-muted/50 block overflow-x-auto rounded-none border p-3 font-mono text-xs break-all">
                                    {hashes?.[name] ?? '—'}
                                </code>
                            </CardContent>
                        </Card>
                    ))}

                    <p className="text-muted-foreground text-xs">
                        SHA hashes are computed in your browser with the Web Crypto API. Nothing is sent to the server.
                    </p>

                    <form onSubmit={generate}>
                        <Card>
                            <CardContent className="space-y-4">
                                <span className="text-sm font-medium">Password hash</span>

                                <div className="grid gap-2">
                                    <Label htmlFor="generate-algorithm">Algorithm</Label>
                                    <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as PasswordHashAlgorithm)}>
                                        <SelectTrigger id="generate-algorithm" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PASSWORD_HASH_ALGORITHMS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="generate-password">Password</Label>
                                    <Input
                                        id="generate-password"
                                        type="password"
                                        autoComplete="off"
                                        value={generatePassword}
                                        onChange={(event) => setGeneratePassword(event.target.value)}
                                        placeholder="Password to hash"
                                        required
                                    />
                                </div>

                                <Button type="submit" disabled={generating || generatePassword === ''}>
                                    {generating ? 'Generating...' : 'Generate hash'}
                                </Button>

                                {generateError && (
                                    <Alert variant="destructive">
                                        <WarningOctagonIcon />
                                        <AlertTitle>Could not generate</AlertTitle>
                                        <AlertDescription>{generateError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">Generated hash</span>
                                        <CopyButton value={generatedHash} />
                                    </div>
                                    <code className="bg-muted/50 block overflow-x-auto rounded-none border p-3 font-mono text-xs break-all">
                                        {generatedHash || '—'}
                                    </code>
                                </div>

                                <p className="text-muted-foreground text-xs">
                                    Generated on the server with PHP&apos;s password_hash, which adds a fresh random salt on every call. The password
                                    is sent to the server and is not stored.
                                </p>
                            </CardContent>
                        </Card>
                    </form>
                </div>

                <form onSubmit={verify} className="space-y-3">
                    <Card>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="verify-algorithm">Algorithm</Label>
                                <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as PasswordHashAlgorithm)}>
                                    <SelectTrigger id="verify-algorithm" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PASSWORD_HASH_ALGORITHMS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="verify-hash">Hash</Label>
                                <Textarea
                                    id="verify-hash"
                                    value={hash}
                                    spellCheck={false}
                                    onChange={(event) => setHash(event.target.value)}
                                    placeholder="$2y$10$..."
                                    className="min-h-24 font-mono"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="verify-password">Password</Label>
                                <Input
                                    id="verify-password"
                                    type="password"
                                    autoComplete="off"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Candidate password"
                                    required
                                />
                            </div>

                            <Button type="submit" disabled={verifying}>
                                {verifying ? 'Verifying...' : 'Verify'}
                            </Button>
                        </CardContent>
                    </Card>

                    {failure && (
                        <Alert variant="destructive">
                            <WarningOctagonIcon />
                            <AlertTitle>Request failed</AlertTitle>
                            <AlertDescription>{failure}</AlertDescription>
                        </Alert>
                    )}

                    {result && result.error && (
                        <Alert variant="destructive">
                            <WarningOctagonIcon />
                            <AlertTitle>Could not verify</AlertTitle>
                            <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                    )}

                    {result && result.ok && (
                        <Alert variant={result.matches ? 'success' : 'destructive'}>
                            {result.matches ? <CheckCircleIcon /> : <XCircleIcon />}
                            <AlertTitle>{result.matches ? 'Match' : 'No match'}</AlertTitle>
                            <AlertDescription className="flex flex-wrap items-center gap-2">
                                <span>{result.matches ? 'The password matches this hash.' : 'The password does not match this hash.'}</span>
                                {result.detected && <Badge variant="outline">{result.detected}</Badge>}
                            </AlertDescription>
                        </Alert>
                    )}

                    <p className="text-muted-foreground text-xs">
                        Verification runs on the server with PHP&apos;s password_verify, which supports bcrypt and Argon2 hashes. The hash and
                        candidate password are sent to the server for this check and are not stored.
                    </p>
                </form>
            </div>
        </ToolPage>
    );
}

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function errorMessage(data: unknown, fallback: string): string {
    const value = data as { message?: unknown; error?: unknown } | null;

    if (typeof value?.message === 'string') {
        return value.message;
    }

    if (typeof value?.error === 'string') {
        return value.error;
    }

    return fallback;
}
