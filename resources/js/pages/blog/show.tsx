import PostInfographic, { InfographicPoint } from '@/components/post-infographic';
import Seo from '@/components/seo';
import { Badge } from '@/components/ui/badge';
import SiteLayout from '@/layouts/site-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeftIcon } from '@phosphor-icons/react';

interface Post {
    slug: string;
    title: string;
    emoji: string;
    description: string;
    date: string;
    formattedDate: string;
    readingTime: number;
    tags: string[];
    infographic: InfographicPoint[];
    html: string;
}

export default function BlogShow({ post }: { post: Post }) {
    return (
        <SiteLayout>
            <Seo
                title={post.title}
                description={post.description}
                type="article"
                publishedTime={post.date}
                tags={post.tags}
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: post.title,
                    description: post.description,
                    datePublished: post.date,
                    keywords: post.tags.join(', '),
                    author: { '@type': 'Person', name: 'Valian Masdani' },
                }}
            />

            <article className="space-y-6">
                <Link href="/blog" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
                    <ArrowLeftIcon className="size-4" />
                    Back to blog
                </Link>

                <header className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        <span aria-hidden>{post.emoji} </span>
                        {post.title}
                    </h1>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <time dateTime={post.date}>{post.formattedDate}</time>
                        <span aria-hidden>&middot;</span>
                        <span>{post.readingTime} min read</span>
                    </div>
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </header>

                {post.infographic.length > 0 && <PostInfographic points={post.infographic} />}

                {/* Rendered on the server by App\Support\Markdown, which escapes all raw HTML. */}
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: post.html }} />
            </article>
        </SiteLayout>
    );
}
