import Seo from '@/components/seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SiteLayout from '@/layouts/site-layout';
import { searchTools, toolCategories, toolPath, tools } from '@/lib/tools';
import { Link } from '@inertiajs/react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

export default function ToolsIndex() {
    const [query, setQuery] = useState('');

    const results = useMemo(() => searchTools(query), [query]);
    const isSearching = query.trim() !== '';

    return (
        <SiteLayout wide>
            <Seo
                title="Utilities"
                description="Free browser-based network, image and on-device AI utilities: ping, speed test, port scanner, DNS, IP check, background removal, OCR, barcode scanning and more. No sign-up, nothing stored."
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'Utilities',
                    description: 'Free browser-based network, image and on-device AI utilities.',
                }}
            />

            <div className="space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Utilities</h1>
                    <p className="text-muted-foreground">
                        A growing set of small tools. Network probes run on the server; image and AI tools run entirely in your browser. No sign-up,
                        nothing stored.
                    </p>
                </div>

                <div className="relative">
                    <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={`Search ${tools.length} tools...`}
                        aria-label="Search tools"
                        className="h-11 pl-9 text-sm"
                    />
                </div>

                {results.length === 0 ? (
                    <div className="border-border text-muted-foreground rounded-none border border-dashed p-10 text-center text-sm">
                        No tools match &ldquo;{query}&rdquo;.
                    </div>
                ) : (
                    toolCategories.map((category) => {
                        const categoryTools = results.filter((tool) => tool.category === category.id);

                        if (categoryTools.length === 0) {
                            return null;
                        }

                        return (
                            <div key={category.id} className="space-y-4">
                                {!isSearching && (
                                    <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{category.label}</h2>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {categoryTools.map((tool) => (
                                        <Link key={tool.slug} href={toolPath(tool.slug)} className="group">
                                            <Card className="group-hover:border-primary/50 h-full transition-colors">
                                                <CardHeader>
                                                    <tool.icon className="text-primary size-6" />
                                                    <CardTitle className="pt-1">{tool.title}</CardTitle>
                                                    <CardDescription>{tool.description}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="text-primary text-sm font-medium">Open &rarr;</CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </SiteLayout>
    );
}
