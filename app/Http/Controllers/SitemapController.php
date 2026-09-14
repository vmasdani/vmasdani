<?php

namespace App\Http\Controllers;

use App\Support\Blog;
use App\Support\Tools;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/**
 * Serves the crawler files: robots.txt plus XML and plain-text sitemaps.
 * Generated from the same sources the site renders from, so new posts and
 * tools show up without a manual list to maintain.
 */
class SitemapController extends Controller
{
    /**
     * The robots.txt served by Laravel (the static public/ copy is removed so
     * the sitemap URL always matches the configured app URL).
     */
    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Allow: /',
            '',
            '# Private areas',
            'Disallow: /dashboard',
            'Disallow: /settings',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /forgot-password',
            'Disallow: /reset-password',
            '',
            'Sitemap: '.url('/sitemap.xml'),
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /**
     * Sitemap in the standard XML format.
     */
    public function xml(): Response
    {
        $body = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $body .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($this->entries() as $entry) {
            $body .= "  <url>\n";
            $body .= '    <loc>'.e($entry['loc'])."</loc>\n";

            if ($entry['lastmod'] !== null) {
                $body .= '    <lastmod>'.$entry['lastmod']."</lastmod>\n";
            }

            $body .= '    <changefreq>'.$entry['changefreq']."</changefreq>\n";
            $body .= '    <priority>'.$entry['priority']."</priority>\n";
            $body .= "  </url>\n";
        }

        $body .= "</urlset>\n";

        return response($body, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /**
     * Sitemap as a plain list of URLs, one per line.
     */
    public function txt(): Response
    {
        $urls = array_map(static fn (array $entry): string => $entry['loc'], $this->entries());

        return response(implode("\n", $urls)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /**
     * @return array<int, array{loc: string, lastmod: ?string, changefreq: string, priority: string}>
     */
    protected function entries(): array
    {
        $entries = [
            ['loc' => url('/'), 'lastmod' => null, 'changefreq' => 'weekly', 'priority' => '1.0'],
            ['loc' => url('/blog'), 'lastmod' => null, 'changefreq' => 'weekly', 'priority' => '0.8'],
        ];

        foreach (Blog::all() as $post) {
            $entries[] = [
                'loc' => url('/blog/'.$post['slug']),
                'lastmod' => Carbon::parse($post['date'])->toDateString(),
                'changefreq' => 'monthly',
                'priority' => '0.7',
            ];
        }

        $entries[] = ['loc' => url('/tools'), 'lastmod' => null, 'changefreq' => 'weekly', 'priority' => '0.8'];

        foreach (Tools::slugs() as $slug) {
            $entries[] = [
                'loc' => url('/tools/'.$slug),
                'lastmod' => null,
                'changefreq' => 'monthly',
                'priority' => '0.6',
            ];
        }

        return $entries;
    }
}
