import ToolPage from '@/components/tool-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PASSWORD_OPTIONS, generatePassword, poolEntropy, selectedPools, type PasswordOptions } from '@/lib/password-generator';
import { analyzePassword } from '@/lib/password-strength';
import { Link } from '@inertiajs/react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

const OPTION_LABELS: { key: keyof Omit<PasswordOptions, 'length'>; label: string }[] = [
    { key: 'lowercase', label: 'Lowercase (a-z)' },
    { key: 'uppercase', label: 'Uppercase (A-Z)' },
    { key: 'digits', label: 'Digits (0-9)' },
    { key: 'symbols', label: 'Symbols (!@#$)' },
    { key: 'excludeAmbiguous', label: 'Exclude look-alikes (I l 1 O 0 o)' },
];

export default function PasswordGeneratorTool() {
    const [length, setLength] = useState(DEFAULT_PASSWORD_OPTIONS.length);
    const [flags, setFlags] = useState({
        lowercase: true,
        uppercase: true,
        digits: true,
        symbols: true,
        excludeAmbiguous: false,
    });
    const [password, setPassword] = useState('');
    const [attempt, setAttempt] = useState(0);

    const options = useMemo<PasswordOptions>(() => ({ length, ...flags }), [length, flags]);

    useEffect(() => {
        try {
            setPassword(generatePassword(options));
        } catch {
            setPassword('');
        }
    }, [options, attempt]);

    const poolSize = selectedPools(options).join('').length;
    const entropy = poolSize > 0 ? poolEntropy(length, poolSize) : 0;
    const analysis = analyzePassword(password);

    return (
        <ToolPage slug="password-generator">
            <Card>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            readOnly
                            value={password}
                            aria-label="Generated password"
                            className="h-11 flex-1 font-mono text-sm"
                            placeholder="Select at least one character set"
                        />
                        <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                            <ArrowsClockwiseIcon />
                            Generate
                        </Button>
                        <CopyButton value={password} className="h-8" />
                    </div>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span>
                            Pool size: <span className="text-foreground tabular-nums">{poolSize}</span>
                        </span>
                        <span>
                            Entropy: <span className="text-foreground tabular-nums">{Math.round(entropy)} bits</span>
                        </span>
                        {password !== '' && <span>Strength: {analysis.verdict.replace('-', ' ')}</span>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4">
                    <div className="grid max-w-xs gap-2">
                        <Label htmlFor="password-length">Length</Label>
                        <Input
                            id="password-length"
                            type="number"
                            min={4}
                            max={256}
                            value={length}
                            onChange={(event) => setLength(Number(event.target.value))}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {OPTION_LABELS.map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={flags[key]}
                                    onCheckedChange={(checked) => setFlags((current) => ({ ...current, [key]: checked === true }))}
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    <p className="text-muted-foreground text-xs">
                        Passwords are generated locally with your browser&apos;s secure random number generator. Check the strength of an existing
                        password with the{' '}
                        <Link href="/tools/password-strength" className="text-primary underline-offset-4 hover:underline">
                            Password Strength
                        </Link>{' '}
                        tool.
                    </p>
                </CardContent>
            </Card>
        </ToolPage>
    );
}
