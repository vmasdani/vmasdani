<?php

namespace App\Support;

/**
 * The server-side slug list for the online tools. The display metadata lives
 * in resources/js/lib/tools.ts; this list only needs to know which slugs are
 * routable so the show route and the sitemap stay in sync.
 */
class Tools
{
    /**
     * @return array<int, string>
     */
    public static function slugs(): array
    {
        return [
            'ping',
            'speedtest',
            'nmap',
            'nslookup',
            'ip',
            'dns-propagation',
            'password-strength',
            'base64',
            'url-encode',
            'hash',
            'password-generator',
            'uuid',
            'timestamp',
            'qr-code',
            'background-remover',
        ];
    }

    public static function exists(string $slug): bool
    {
        return in_array($slug, self::slugs(), true);
    }
}
