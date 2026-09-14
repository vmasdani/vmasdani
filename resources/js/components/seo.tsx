import { Head, usePage } from '@inertiajs/react';

interface SeoProps {
    title: string;
    description: string;
    type?: 'website' | 'article';
    image?: string;
    publishedTime?: string;
    tags?: string[];
    jsonLd?: Record<string, unknown>;
}

interface SeoConfig {
    siteName?: string;
    baseUrl?: string;
    image?: string;
    twitter?: string | null;
}

/**
 * Central place for per-page meta tags. Inertia's <Head> renders these on the
 * client and, when SSR is running, on the server too. Site-wide defaults come
 * from the `seo` shared prop registered in HandleInertiaRequests.
 */
export default function Seo({ title, description, type = 'website', image, publishedTime, tags, jsonLd }: SeoProps) {
    const { props, url } = usePage();
    const seo = (props.seo ?? {}) as SeoConfig;

    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = (seo.baseUrl || fallbackBase).replace(/\/$/, '');
    const path = url.split('?')[0];

    const canonical = `${baseUrl}${path}`;
    const imagePath = image ?? seo.image ?? '/logo.svg';
    const ogImage = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;
    const siteName = seo.siteName ?? 'Valian Masdani';

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonical} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonical} />
            <meta property="og:image" content={ogImage} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />
            {seo.twitter && <meta name="twitter:site" content={seo.twitter} />}

            {type === 'article' && publishedTime && <meta property="article:published_time" content={publishedTime} />}
            {type === 'article' && tags?.map((tag) => <meta key={tag} property="article:tag" content={tag} />)}

            {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
        </Head>
    );
}
