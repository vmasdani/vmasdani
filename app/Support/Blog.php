<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Reads the blog folder of Markdown files. Static-first: posts live on disk,
 * there is no database backing them.
 */
class Blog
{
    /**
     * Absolute path to the folder holding the Markdown posts.
     */
    public static function path(): string
    {
        return base_path('blog');
    }

    /**
     * Every post's metadata, newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function all(): array
    {
        $files = glob(self::path().'/*.md') ?: [];

        $posts = [];

        foreach ($files as $file) {
            $post = self::summary($file);

            if ($post !== null && ! $post['draft']) {
                $posts[] = $post;
            }
        }

        usort($posts, static fn (array $a, array $b): int => strcmp($b['date'], $a['date']));

        return $posts;
    }

    /**
     * Find a single post by its slug, or null when it does not exist.
     *
     * @return array<string, mixed>|null
     */
    public static function find(string $slug): ?array
    {
        foreach (glob(self::path().'/*.md') ?: [] as $file) {
            if (self::slugFromFilename($file) === $slug) {
                return self::full($file);
            }
        }

        return null;
    }

    /**
     * Metadata only, used for listings.
     *
     * @return array<string, mixed>|null
     */
    protected static function summary(string $file): ?array
    {
        $parsed = self::read($file);

        if ($parsed === null) {
            return null;
        }

        return [
            'slug' => self::slugFromFilename($file),
            'title' => $parsed['title'],
            'emoji' => $parsed['emoji'],
            'description' => $parsed['description'],
            'date' => $parsed['date'],
            'formattedDate' => $parsed['formattedDate'],
            'readingTime' => $parsed['readingTime'],
            'tags' => $parsed['tags'],
            'infographic' => $parsed['infographic'],
            'excerpt' => $parsed['excerpt'],
            'draft' => $parsed['draft'],
        ];
    }

    /**
     * Metadata plus the rendered HTML body.
     *
     * @return array<string, mixed>|null
     */
    protected static function full(string $file): ?array
    {
        $parsed = self::read($file);

        if ($parsed === null) {
            return null;
        }

        return array_merge($parsed, [
            'slug' => self::slugFromFilename($file),
            'html' => $parsed['html'],
        ]);
    }

    /**
     * Read and normalise a single post file.
     *
     * @return array<string, mixed>|null
     */
    protected static function read(string $file): ?array
    {
        $contents = file_get_contents($file);

        if ($contents === false) {
            return null;
        }

        $parsed = Markdown::parse($contents);
        $front = $parsed['frontMatter'];
        $filename = basename($file);

        $title = (string) ($front['title'] ?? self::titleFromFilename($filename));
        $date = self::resolveDate($front, $filename);
        $body = trim($parsed['html']);

        $description = isset($front['description'])
            ? (string) $front['description']
            : Str::limit(trim(strip_tags($body)), 160);

        // The first body paragraph, shown on the homepage map cards. The
        // article opens with its title heading, so skip any leading <h*>.
        $excerpt = '';
        if (preg_match('/<p>(.*?)<\/p>/s', $body, $matches)) {
            $excerpt = Str::limit(trim(strip_tags($matches[1])), 240);
        }

        return [
            'title' => $title,
            'emoji' => Emoji::forPost([
                'title' => $title,
                'tags' => self::normalizeTags($front['tags'] ?? []),
                'html' => $parsed['html'],
            ]),
            'description' => $description,
            'excerpt' => $excerpt,
            'date' => $date->toDateString(),
            'formattedDate' => $date->format('F j, Y'),
            'readingTime' => self::readingTime($parsed['html']),
            'tags' => self::normalizeTags($front['tags'] ?? []),
            'infographic' => self::normalizeInfographic($front['infographic'] ?? []),
            'draft' => (bool) ($front['draft'] ?? false),
            'html' => $body,
        ];
    }

    /**
     * Pull a Carbon instance from front matter, the filename, or "now".
     */
    protected static function resolveDate(array $front, string $filename): Carbon
    {
        if (isset($front['date']) && preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $front['date'])) {
            return Carbon::parse((string) $front['date']);
        }

        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', basename($filename), $matches)) {
            return Carbon::parse($matches[1]);
        }

        return Carbon::now();
    }

    /**
     * Derive a URL slug from a filename, ignoring any date/number prefix.
     */
    protected static function slugFromFilename(string $file): string
    {
        $name = pathinfo(basename($file), PATHINFO_FILENAME);
        $name = preg_replace('/^\d{4}-\d{2}-\d{2}(-\d+)?-?/', '', $name) ?? $name;

        return Str::slug($name) ?: Str::slug($name = basename($file, '.md'));
    }

    /**
     * Turn a filename into a human readable title.
     */
    protected static function titleFromFilename(string $filename): string
    {
        $name = self::slugFromFilename($filename);

        return Str::title(str_replace('-', ' ', $name));
    }

    /**
     * @return array<int, string>
     */
    protected static function normalizeTags(mixed $tags): array
    {
        if (is_string($tags)) {
            $tags = Str::of($tags)->split('/[,;]/')->map(Str::trim(...))->filter()->all();
        }

        if (! is_array($tags)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (mixed $tag): string => is_scalar($tag) ? trim((string) $tag) : '',
            $tags
        ), static fn (string $tag): bool => $tag !== ''));
    }

    /**
     * Turn front matter infographic lines into emoji/label points.
     *
     * Each line is expected to start with an emoji followed by a short label,
     * e.g. `- "🔍 Finding the needle in a haystack"`.
     *
     * @return array<int, array{emoji: string, label: string}>
     */
    protected static function normalizeInfographic(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $points = [];

        foreach ($items as $item) {
            $item = trim((string) $item);

            if ($item === '') {
                continue;
            }

            if (preg_match('/^(\S+)\s+(.*)$/u', $item, $matches) && ! preg_match('/[\p{L}\p{N}]/u', $matches[1])) {
                $points[] = ['emoji' => $matches[1], 'label' => trim($matches[2])];
            } else {
                $points[] = ['emoji' => '', 'label' => $item];
            }
        }

        return $points;
    }

    /**
     * Rough reading time based on word count.
     */
    protected static function readingTime(string $html): int
    {
        $words = str_word_count(strip_tags($html));

        return max(1, (int) ceil($words / 200));
    }
}
