import Seo from '@/components/seo';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import SiteLayout from '@/layouts/site-layout';
import { Link, router } from '@inertiajs/react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';

interface PostSummary {
    slug: string;
    title: string;
    emoji: string;
    description: string;
    date: string;
    formattedDate: string;
    readingTime: number;
    tags: string[];
}

interface BlogIndexProps {
    posts: PostSummary[];
    search: string;
}

export default function BlogIndex({ posts, search }: BlogIndexProps) {
    const [term, setTerm] = useState(search);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get('/blog', term ? { q: term } : {}, { preserveState: true, replace: true });
    };

    return (
        <SiteLayout>
            <Seo title="Blog" description="Notes, tutorials and things I build. Written in Markdown and rendered on the server." />

            <div className="space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
                    <p className="text-muted-foreground">Notes, tutorials and things I build. Written in Markdown, rendered on the server.</p>
                </div>

                <form onSubmit={submit} className="relative max-w-sm">
                    <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Search posts..."
                        className="pl-9"
                        aria-label="Search posts"
                    />
                </form>

                {posts.length === 0 ? (
                    <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
                        No posts found{search ? ` for "${search}"` : ''}.
                    </p>
                ) : (
                    <ul className="divide-border divide-y">
                        {posts.map((post) => (
                            <li key={post.slug}>
                                <Link
                                    href={`/blog/${post.slug}`}
                                    className="group hover:bg-muted/50 -mx-4 flex flex-col gap-2 rounded-md px-4 py-5 transition-colors sm:flex-row sm:items-start sm:justify-between"
                                >
                                    <div className="space-y-1.5">
                                        <h2 className="group-hover:text-primary font-medium">
                                            <span aria-hidden>{post.emoji} </span>
                                            {post.title}
                                        </h2>
                                        <p className="text-muted-foreground max-w-2xl text-sm">{post.description}</p>
                                        {post.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {post.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs sm:flex-col sm:items-end sm:gap-1">
                                        <time dateTime={post.date}>{post.formattedDate}</time>
                                        <span>{post.readingTime} min read</span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </SiteLayout>
    );
}
