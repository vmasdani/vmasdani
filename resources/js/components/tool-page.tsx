import Seo from '@/components/seo';
import SiteLayout from '@/layouts/site-layout';
import { tools } from '@/lib/tools';
import type { ReactNode } from 'react';

interface ToolPageProps {
    slug: string;
    children: ReactNode;
    /** Override the registry description, e.g. for longer SEO copy. */
    description?: string;
    /** Optional controls rendered next to the title. */
    actions?: ReactNode;
}

/**
 * Shared shell for the client-only tools: pulls the title and description
 * from the registry, renders the SEO tags and the heading, and slots the
 * tool body underneath. Keeps each tool page focused on its actual logic.
 */
export default function ToolPage({ slug, children, description, actions }: ToolPageProps) {
    const tool = tools.find((entry) => entry.slug === slug);
    const title = tool?.title ?? 'Tool';
    const text = description ?? tool?.description ?? '';

    return (
        <SiteLayout>
            <Seo title={title} description={text} />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        {text !== '' && <p className="text-muted-foreground text-sm">{text}</p>}
                    </div>
                    {actions}
                </div>

                {children}
            </div>
        </SiteLayout>
    );
}
