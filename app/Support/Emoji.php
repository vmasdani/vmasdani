<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Chooses a single representative emoji for a post based on its title, tags
 * and body. Purely cosmetic: falls back to a neutral glyph when nothing hits.
 */
class Emoji
{
    /**
     * Ordered keyword groups. The first group with a match wins, so more
     * specific phrases are listed before generic ones.
     *
     * @var array<string, array<int, string>>
     */
    protected const MAP = [
        '🚀' => ['launch', 'release', 'ship', 'deploy', 'rollout'],
        '🛠️' => ['tool', 'tools', 'utility', 'utilities', 'cli', 'script'],
        '🌐' => ['network', 'http', 'dns', 'ip address', 'ping', 'latency', 'internet', 'nmap', 'port', 'firewall', 'proxy', 'latency'],
        '🔒' => ['security', 'secure', 'encrypt', 'auth', 'oauth', 'jwt', 'vulnerability', 'cve', 'password', 'xss'],
        '🐘' => ['mysql', 'mariadb', 'database', 'postgresql', 'postgres', 'sqlite', 'redis', 'sql', 'query', 'migration'],
        '🦚' => ['laravel', 'artisan', 'eloquent', 'blade', 'elegant'],
        '⚛️' => ['react', 'inertia', 'component', 'jsx', 'hook', 'hooks'],
        '🎨' => ['design', 'css', 'tailwind', 'style', 'theme', 'ui', 'color', 'figma'],
        '🧪' => ['test', 'testing', 'tests', 'pest', 'phpunit', 'coverage', 'spec'],
        '🐛' => ['bug', 'debug', 'fix', 'patch', 'issue', 'crash', 'error'],
        '⚡' => ['performance', 'optimize', 'speed', 'cache', 'fast', 'benchmark', 'lazy'],
        '🧠' => ['ai', 'llm', 'model', 'neural', 'machine learning', 'prompt', 'gpt'],
        '📦' => ['package', 'composer', 'npm', 'dependency', 'module', 'bundle', 'library'],
        '🔧' => ['config', 'configuration', 'setup', 'install', 'environment', 'env'],
        '📝' => ['writing', 'essay', 'thoughts', 'reflection', 'journal', 'opinion'],
        '🎓' => ['tutorial', 'guide', 'learn', 'course', 'beginner', 'how to', 'walkthrough'],
        '💡' => ['idea', 'tip', 'trick', 'insight', 'hack', 'hackathon'],
        '👋' => ['hello', 'welcome', 'intro', 'introduction', 'first', 'meet'],
        '🗺️' => ['roadmap', 'plan', 'planning', 'goals', 'todo'],
        '🧩' => ['plugin', 'extension', 'integration', 'api', 'webhook'],
        '🖥️' => ['server', 'ubuntu', 'linux', 'docker', 'nginx', 'vps', 'cloud', 'devops'],
        '📈' => ['growth', 'analytics', 'metrics', 'seo', 'traffic', 'data'],
        '🔑' => ['key', 'token', 'secret', 'credential', 'access'],
        '📷' => ['photo', 'image', 'picture', 'camera', 'gallery'],
        '🎮' => ['game', 'gaming', 'play', 'fun'],
        '💰' => ['money', 'billing', 'payment', 'price', 'revenue', 'cost'],
        '⏱️' => ['time', 'schedule', 'cron', 'queue', 'timeout'],
        '🔍' => ['search', 'find', 'scan', 'explore', 'discover'],
    ];

    /**
     * Pick the best emoji for a post.
     *
     * @param  array<string, mixed>  $post
     */
    public static function forPost(array $post): string
    {
        $tags = $post['tags'] ?? [];

        $haystack = Str::lower(
            trim(
                (string) ($post['title'] ?? '').' '.
                implode(' ', array_map('strval', is_array($tags) ? $tags : [])).' '.
                strip_tags((string) ($post['html'] ?? ''))
            )
        );

        foreach (self::MAP as $emoji => $keywords) {
            foreach ($keywords as $keyword) {
                // Word-boundary match so "ip" doesn't fire inside "description".
                if (preg_match('/(?<![\p{L}\p{N}])'.preg_quote($keyword, '/').'(?![\p{L}\p{N}])/u', $haystack)) {
                    return $emoji;
                }
            }
        }

        return '✍️';
    }
}
