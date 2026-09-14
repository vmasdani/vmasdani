export interface InfographicPoint {
    emoji: string;
    label: string;
}

interface PostInfographicProps {
    heading?: string;
    points: InfographicPoint[];
}

export default function PostInfographic({ points, heading = 'At a glance' }: PostInfographicProps) {
    if (points.length === 0) {
        return null;
    }

    return (
        <section aria-label={heading} className="from-primary/5 via-background to-background rounded-2xl border bg-gradient-to-br p-5 sm:p-6">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{heading}</h2>

            <ol className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {points.map((point, index) => (
                    <li key={`${point.label}-${index}`} className="bg-background flex items-center gap-3 rounded-xl border px-3.5 py-3 shadow-xs">
                        <span aria-hidden className="w-8 shrink-0 text-center text-2xl leading-none">
                            {point.emoji || '•'}
                        </span>
                        <p className="min-w-0 text-sm leading-snug font-medium">{point.label}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
