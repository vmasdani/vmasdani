import Seo from '@/components/seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SiteLayout from '@/layouts/site-layout';
import { Link } from '@inertiajs/react';
import { ArrowRightIcon, FacebookLogoIcon, GithubLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';

interface PostSummary {
    slug: string;
    title: string;
    emoji: string;
    description: string;
    date: string;
    formattedDate: string;
    readingTime: number;
    tags: string[];
    excerpt: string;
}

interface WelcomePost {
    slug: string;
    title: string;
    description: string;
    html: string;
}

const social = [
    { label: 'GitHub', href: 'https://github.com/vmasdani', icon: GithubLogoIcon },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/%F0%9F%94%8Cvalian-masdani-67736215b/', icon: LinkedinLogoIcon },
    { label: 'Facebook', href: 'https://www.facebook.com/valianmasdani', icon: FacebookLogoIcon },
];

const principles = [
    { emoji: '🪶', label: 'Simpler' },
    { emoji: '⚡', label: 'Faster' },
    { emoji: '💰', label: 'Cheaper' },
    { emoji: '🛡️', label: 'More reliable' },
    { emoji: '💪', label: 'More capable' },
];

export default function Home({ post, posts }: { post: WelcomePost | null; posts: PostSummary[] }) {
    return (
        <SiteLayout>
            <Seo
                title="Blog & Utilities"
                description="Valian Masdani's blog and a growing set of small, no-sign-up network utilities: ping, speed test, port scanner, DNS lookup and more."
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'Valian Masdani',
                    description: 'A blog and a growing set of small, no-sign-up network utilities.',
                    author: { '@type': 'Person', name: 'Valian Masdani' },
                }}
            />

            <div className="space-y-10">
                <section className="space-y-4 text-center sm:text-left">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Valian Masdani&apos;s Site</h1>
                    <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:mx-0">
                        The digital twin of (almost) everything inside my brain. Technology should make things:
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {principles.map((principle) => (
                            <Badge key={principle.label} variant="secondary" className="gap-1 rounded-full px-3 py-1 text-sm">
                                <span aria-hidden>{principle.emoji}</span>
                                {principle.label}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                        {social.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={item.label}
                                className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 items-center justify-center rounded-md border transition-colors"
                            >
                                <item.icon className="size-4" />
                            </a>
                        ))}
                    </div>
                </section>

                {post && (
                    <article className="bg-card space-y-4 rounded-2xl border p-5 shadow-xs">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            <span aria-hidden>👋 </span>
                            {post.title}
                        </h2>

                        {/* Rendered on the server by App\Support\Markdown, which escapes all raw HTML. */}
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: post.html }} />
                    </article>
                )}

                {posts.length > 0 && (
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">🗺️ The map</h2>
                            <p className="text-muted-foreground text-sm">
                                Every corner of the brain, one post at a time. Each card opens with the post's first lines.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {posts.map((entry) => (
                                <Link
                                    key={entry.slug}
                                    href={`/blog/${entry.slug}`}
                                    className="group bg-card hover:border-primary/40 flex flex-col gap-3 rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="group-hover:text-primary font-semibold">
                                            <span aria-hidden>{entry.emoji} </span>
                                            {entry.title}
                                        </h3>
                                        <span className="text-muted-foreground shrink-0 text-xs">{entry.readingTime} min</span>
                                    </div>

                                    <p className="text-muted-foreground line-clamp-3 text-sm leading-snug">{entry.excerpt}</p>

                                    <p className="text-muted-foreground/70 mt-auto text-xs">
                                        <time dateTime={entry.date}>{entry.formattedDate}</time>
                                    </p>
                                </Link>
                            ))}
                        </div>

                        <Button asChild variant="outline">
                            <Link href="/blog">
                                Browse all posts
                                <ArrowRightIcon className="size-4" />
                            </Link>
                        </Button>
                    </section>
                )}
            </div>
        </SiteLayout>
    );
}
