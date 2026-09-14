import Seo from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SiteLayout from '@/layouts/site-layout';
import { analyzePassword, checkBreaches } from '@/lib/password-strength';
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, ShieldWarningIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

type BreachState = { status: 'idle' } | { status: 'checking' } | { status: 'safe' } | { status: 'pwned'; count: number } | { status: 'unavailable' };

const SCORES = [
    { label: 'Very weak', bar: 'bg-red-500', text: 'text-red-500' },
    { label: 'Weak', bar: 'bg-orange-500', text: 'text-orange-500' },
    { label: 'Fair', bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-500' },
    { label: 'Strong', bar: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-500' },
    { label: 'Very strong', bar: 'bg-green-500', text: 'text-green-600 dark:text-green-500' },
];

function formatGuesses(guesses: number): string {
    if (!Number.isFinite(guesses)) {
        return 'practically infinite';
    }

    if (guesses >= 1e15) {
        return guesses.toExponential(2).replace('e+', ' x 10^');
    }

    return Math.round(guesses).toLocaleString();
}

export default function PasswordStrengthTool() {
    const [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false);
    const [breach, setBreach] = useState<BreachState>({ status: 'idle' });

    const analysis = useMemo(() => analyzePassword(password), [password]);
    const style = SCORES[analysis.score];

    useEffect(() => {
        if (password.length < 4) {
            setBreach({ status: 'idle' });

            return;
        }

        const controller = new AbortController();
        setBreach({ status: 'checking' });

        const timer = setTimeout(async () => {
            const count = await checkBreaches(password, controller.signal);

            if (controller.signal.aborted) {
                return;
            }

            if (count === null) {
                setBreach({ status: 'unavailable' });
            } else if (count > 0) {
                setBreach({ status: 'pwned', count });
            } else {
                setBreach({ status: 'safe' });
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [password]);

    return (
        <SiteLayout>
            <Seo
                title="Password Strength Check"
                description="Check how strong a password is and whether it has appeared in a data breach. Everything runs in your browser."
            />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">How strong is my password?</h1>
                    <p className="text-muted-foreground text-sm">
                        Estimate the strength of a password and check it against known data breaches. Nothing is sent to this server.
                    </p>
                </div>

                <Card>
                    <CardContent className="space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={visible ? 'text' : 'password'}
                                    value={password}
                                    autoComplete="new-password"
                                    spellCheck={false}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Type a password to test"
                                    className="h-11 pr-10 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setVisible((current) => !current)}
                                    aria-label={visible ? 'Hide password' : 'Show password'}
                                    className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
                                >
                                    {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                </Button>
                            </div>
                        </div>

                        {password.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className={`font-medium ${style.text}`}>{style.label}</span>
                                    <span className="text-muted-foreground tabular-nums">{Math.round(analysis.entropy)} bits of entropy</span>
                                </div>

                                <div className="flex gap-1">
                                    {SCORES.map((segment, index) => (
                                        <div
                                            key={segment.label}
                                            className={`h-2 flex-1 rounded-full transition-colors ${
                                                index <= analysis.score ? style.bar : 'bg-muted'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <BreachRow state={breach} />
                    </CardContent>
                </Card>

                {password.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Metric label="Entropy" value={`${Math.round(analysis.entropy)} bits`} />
                            <Metric label="Character pool" value={`${analysis.pool}`} />
                            <Metric label="Online guesses" value={analysis.onlineCrackTime} />
                            <Metric label="Offline guesses" value={analysis.offlineCrackTime} />
                        </div>

                        <p className="text-muted-foreground text-xs">
                            A brute-force estimate of {formatGuesses(analysis.guesses)} guesses. &ldquo;Online&rdquo; assumes a throttled login form
                            (100 guesses/second); &ldquo;offline&rdquo; assumes an attacker with your stolen hash on a fast GPU rig (10
                            billion/second).
                        </p>

                        {analysis.warnings.length > 0 && (
                            <Card className="border-destructive/40">
                                <CardContent className="space-y-1.5">
                                    {analysis.warnings.map((warning) => (
                                        <p key={warning} className="text-destructive flex items-start gap-2 text-sm">
                                            <ShieldWarningIcon className="mt-0.5 size-4 shrink-0" />
                                            {warning}
                                        </p>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {analysis.suggestions.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">How to make it stronger</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
                                        {analysis.suggestions.map((suggestion) => (
                                            <li key={suggestion}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">How this is calculated</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2 text-sm">
                        <p>
                            <span className="text-foreground font-medium">Entropy.</span> The base score is{' '}
                            <code className="bg-muted rounded px-1 py-0.5 text-xs">length x log2(character pool)</code>, where the pool counts the
                            lower-case, upper-case, digit and symbol alphabets you actually use.
                        </p>
                        <p>
                            <span className="text-foreground font-medium">Pattern penalties.</span> Entropy is reduced for repeated characters,
                            straight sequences (<code className="bg-muted rounded px-1 py-0.5 text-xs">abc</code>,{' '}
                            <code className="bg-muted rounded px-1 py-0.5 text-xs">qwerty</code>,{' '}
                            <code className="bg-muted rounded px-1 py-0.5 text-xs">1234</code>
                            ), dates and years, a repeated block, and using only one or two character classes.
                        </p>
                        <p>
                            <span className="text-foreground font-medium">Common passwords.</span> A password on a known common list is capped at a
                            handful of bits no matter how it is typed.
                        </p>
                        <p>
                            <span className="text-foreground font-medium">Breach check.</span> We hash the password with SHA-1{' '}
                            <em>inside your browser</em> and send only the first five characters of that hash to the{' '}
                            <a
                                href="https://haveibeenpwned.com/Passwords"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                Have I Been Pwned
                            </a>{' '}
                            range API. The password itself never leaves your device.
                        </p>
                        <p className="text-xs">
                            This is a transparent heuristic, close in spirit to zxcvbn but smaller. Treat it as good guidance, not a guarantee. For
                            real accounts, use a password manager and a long, unique passphrase.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </SiteLayout>
    );
}

function BreachRow({ state }: { state: BreachState }) {
    if (state.status === 'idle') {
        return null;
    }

    if (state.status === 'checking') {
        return (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <SpinnerGapIcon className="size-4 animate-spin" />
                Checking breach databases...
            </div>
        );
    }

    if (state.status === 'safe') {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                <CheckCircleIcon className="size-4" />
                Not found in known data breaches.
            </div>
        );
    }

    if (state.status === 'pwned') {
        return (
            <div className="text-destructive flex items-center gap-2 text-sm font-medium">
                <ShieldWarningIcon className="size-4" />
                Found in {state.count.toLocaleString()} known data breaches. Do not use this password.
            </div>
        );
    }

    return <div className="text-muted-foreground text-sm">Breach check unavailable right now.</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
        </div>
    );
}
