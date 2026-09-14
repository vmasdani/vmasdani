<?php

namespace App\Support;

/**
 * A small, dependency-free Markdown parser.
 *
 * Everything the source contains is HTML-escaped before any Markdown syntax is
 * applied, so raw HTML and dangerous link schemes can never reach the browser.
 * Supports the subset needed for the blog: front matter, headings, emphasis,
 * inline code, fenced code blocks, links, images, lists, blockquotes, tables,
 * and horizontal rules.
 */
class Markdown
{
    /**
     * Parse a full document into front matter metadata and rendered HTML body.
     *
     * @return array{frontMatter: array<string, mixed>, html: string}
     */
    public static function parse(string $document): array
    {
        [$frontMatter, $body] = self::splitFrontMatter($document);

        return [
            'frontMatter' => self::parseFrontMatter($frontMatter),
            'html' => self::render($body),
        ];
    }

    /**
     * Render a Markdown body (without front matter) to HTML.
     */
    public static function render(string $markdown): string
    {
        $lines = preg_split('/\r\n|\r|\n/', $markdown) ?: [];

        $html = [];
        $count = count($lines);
        $index = 0;

        while ($index < $count) {
            $line = $lines[$index];
            $trimmed = trim($line);

            if ($trimmed === '') {
                $index++;

                continue;
            }

            // Fenced code block.
            if (preg_match('/^```(.*)$/', $trimmed, $matches)) {
                $language = trim($matches[1]);
                $buffer = [];
                $index++;

                while ($index < $count && ! preg_match('/^```\s*$/', trim($lines[$index]))) {
                    $buffer[] = $lines[$index];
                    $index++;
                }

                $index++; // consume closing fence
                $html[] = self::codeBlock(implode("\n", $buffer), $language);

                continue;
            }

            // Heading.
            if (preg_match('/^(#{1,6})\s+(.*)$/', $trimmed, $matches)) {
                $level = strlen($matches[1]);
                $html[] = '<h'.$level.'>'.self::inline(trim($matches[2])).'</h'.$level.'>';
                $index++;

                continue;
            }

            // Horizontal rule.
            if (preg_match('/^(\*{3,}|-{3,}|_{3,})$/', $trimmed)) {
                $html[] = '<hr>';
                $index++;

                continue;
            }

            // Blockquote.
            if (str_starts_with($trimmed, '>')) {
                $buffer = [];

                while ($index < $count && str_starts_with(trim($lines[$index]), '>')) {
                    $buffer[] = preg_replace('/^>\s?/', '', trim($lines[$index]));
                    $index++;
                }

                $html[] = '<blockquote>'.self::render(implode("\n", $buffer)).'</blockquote>';

                continue;
            }

            // Table.
            if (str_contains($trimmed, '|') && $index + 1 < $count && self::isTableSeparator(trim($lines[$index + 1]))) {
                $table = [$trimmed, trim($lines[$index + 1])];
                $index += 2;

                while ($index < $count && str_contains(trim($lines[$index]), '|') && trim($lines[$index]) !== '') {
                    $table[] = trim($lines[$index]);
                    $index++;
                }

                $html[] = self::table($table);

                continue;
            }

            // Unordered list.
            if (preg_match('/^[-*+]\s+/', $trimmed)) {
                $items = [];

                while ($index < $count && preg_match('/^[-*+]\s+(.*)$/', trim($lines[$index]), $matches)) {
                    $items[] = self::inline($matches[1]);
                    $index++;
                }

                $html[] = '<ul>'.implode('', array_map(
                    static fn (string $item): string => '<li>'.$item.'</li>',
                    $items
                )).'</ul>';

                continue;
            }

            // Ordered list.
            if (preg_match('/^\d+\.\s+/', $trimmed)) {
                $items = [];

                while ($index < $count && preg_match('/^\d+\.\s+(.*)$/', trim($lines[$index]), $matches)) {
                    $items[] = self::inline($matches[1]);
                    $index++;
                }

                $html[] = '<ol>'.implode('', array_map(
                    static fn (string $item): string => '<li>'.$item.'</li>',
                    $items
                )).'</ol>';

                continue;
            }

            // Paragraph: gather consecutive plain lines.
            $buffer = [];

            while ($index < $count) {
                $current = trim($lines[$index]);

                if ($current === '' || self::isBlockStart($current)) {
                    break;
                }

                $buffer[] = $current;
                $index++;
            }

            if ($buffer !== []) {
                $html[] = '<p>'.self::inline(implode(' ', $buffer)).'</p>';
            }
        }

        return implode("\n", $html);
    }

    /**
     * Determine whether a line begins a non-paragraph block.
     */
    protected static function isBlockStart(string $trimmed): bool
    {
        return (bool) preg_match('/^(#{1,6}\s|>|```|[-*+]\s|\d+\.\s|(\*{3,}|-{3,}|_{3,})$)/', $trimmed);
    }

    /**
     * Render inline Markdown to HTML, escaping anything unsafe first.
     */
    public static function inline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        // Images: ![alt](url) — protect from link handling by processing first.
        $escaped = preg_replace_callback(
            '/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/',
            static function (array $matches): string {
                $url = self::sanitizeUrl($matches[2]);

                if ($url === '') {
                    return htmlspecialchars($matches[0], ENT_QUOTES, 'UTF-8');
                }

                $alt = $matches[1];
                $title = isset($matches[3]) && $matches[3] !== '' ? ' title="'.$matches[3].'"' : '';

                return '<img src="'.$url.'" alt="'.$alt.'"'.$title.'>';
            },
            $escaped
        );

        // Links: [text](url)
        $escaped = preg_replace_callback(
            '/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/',
            static function (array $matches): string {
                $url = self::sanitizeUrl($matches[2]);

                if ($url === '') {
                    return $matches[1];
                }

                $title = isset($matches[3]) && $matches[3] !== '' ? ' title="'.$matches[3].'"' : '';
                $rel = preg_match('/^https?:\/\//i', $url) ? ' rel="noopener noreferrer"' : '';

                return '<a href="'.$url.'"'.$title.$rel.'>'.$matches[1].'</a>';
            },
            $escaped
        );

        $replacements = [
            '/`([^`]+)`/' => '<code>$1</code>',
            '/\*\*([^*]+)\*\*/' => '<strong>$1</strong>',
            '/__([^_]+)__/' => '<strong>$1</strong>',
            '/(?<![\w*])\*([^*\s][^*]*?)\*(?![\w*])/' => '<em>$1</em>',
            '/(?<![\w_])_([^_\s][^_]*?)_(?![\w_])/' => '<em>$1</em>',
            '/~~([^~]+)~~/' => '<del>$1</del>',
        ];

        foreach ($replacements as $pattern => $replacement) {
            $escaped = preg_replace($pattern, $replacement, $escaped);
        }

        return $escaped;
    }

    /**
     * Wrap escaped code in a <pre><code> block, tagging the language when known.
     */
    protected static function codeBlock(string $code, string $language): string
    {
        $code = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $class = $language !== '' ? ' class="language-'.htmlspecialchars($language, ENT_QUOTES, 'UTF-8').'"' : '';

        return '<pre><code'.$class.'>'.$code.'</code></pre>';
    }

    /**
     * Allow only benign link schemes; everything else is dropped.
     */
    protected static function sanitizeUrl(string $url): string
    {
        $url = trim($url);

        if (preg_match('/^(https?:|mailto:|tel:|\/|#|\.)/i', $url)) {
            return $url;
        }

        // Reject explicit scheme URLs (javascript:, data:, vbscript:, etc.).
        if (preg_match('/^[a-z][a-z0-9+.-]*:/i', $url)) {
            return '';
        }

        return $url; // treat as relative
    }

    /**
     * Split the leading YAML-ish front matter delimited by --- fences.
     *
     * @return array{0: string, 1: string}
     */
    protected static function splitFrontMatter(string $document): array
    {
        $document = preg_replace('/^\x{FEFF}/u', '', $document) ?? $document;

        if (! preg_match('/^---\r?\n(.*?)\r?\n---\r?\n?(.*)$/s', $document, $matches)) {
            return ['', $document];
        }

        return [$matches[1], $matches[2]];
    }

    /**
     * Parse simple `key: value` front matter (scalars and bracket/block lists).
     *
     * @return array<string, mixed>
     */
    protected static function parseFrontMatter(string $block): array
    {
        $data = [];

        if (trim($block) === '') {
            return $data;
        }

        $lines = preg_split('/\r\n|\r|\n/', $block) ?: [];
        $count = count($lines);

        for ($i = 0; $i < $count; $i++) {
            $line = rtrim($lines[$i]);

            if ($line === '' || ! preg_match('/^([A-Za-z0-9_\-]+):\s*(.*)$/', $line, $matches)) {
                continue;
            }

            $key = $matches[1];
            $value = trim($matches[2]);

            if ($value === '') {
                // Gather an indented block list.
                $items = [];

                while ($i + 1 < $count && preg_match('/^\s*-\s*(.*)$/', $lines[$i + 1], $itemMatch)) {
                    $items[] = self::scalar(trim($itemMatch[1]));
                    $i++;
                }

                $data[$key] = $items;

                continue;
            }

            if (preg_match('/^\[(.*)\]$/s', $value, $bracket)) {
                $inner = trim($bracket[1]);

                if ($inner === '') {
                    $data[$key] = [];
                } else {
                    $data[$key] = array_map(
                        static fn (string $item): mixed => self::scalar(trim($item)),
                        preg_split('/,(?![^\[]*\])/', $inner) ?: []
                    );
                }

                continue;
            }

            $data[$key] = self::scalar($value);
        }

        return $data;
    }

    /**
     * Coerce a scalar front matter token into a PHP value.
     */
    protected static function scalar(string $value): mixed
    {
        if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
            return $matches[2];
        }

        return match (strtolower($value)) {
            'true' => true,
            'false' => false,
            'null', '' => null,
            default => preg_match('/^-?\d+$/', $value) ? (int) $value : $value,
        };
    }

    /**
     * Build an HTML table from pipe-delimited lines.
     *
     * @param  array<int, string>  $lines
     */
    protected static function table(array $lines): string
    {
        $header = self::tableRow($lines[0]);
        $alignments = array_map(
            static fn (string $cell): string => self::columnAlignment($cell),
            self::tableRow($lines[1])
        );

        $body = array_slice($lines, 2);

        $html = '<table><thead><tr>';

        foreach ($header as $column => $cell) {
            $html .= '<th'.self::alignmentStyle($alignments[$column] ?? null).'>'.$cell.'</th>';
        }

        $html .= '</tr></thead><tbody>';

        foreach ($body as $row) {
            $cells = self::tableRow($row);
            $html .= '<tr>';

            foreach ($cells as $column => $cell) {
                $html .= '<td'.self::alignmentStyle($alignments[$column] ?? null).'>'.$cell.'</td>';
            }

            $html .= '</tr>';
        }

        return $html.'</tbody></table>';
    }

    /**
     * Split a pipe row into escaped inline cells.
     *
     * @return array<int, string>
     */
    protected static function tableRow(string $row): array
    {
        $row = trim($row);
        $row = preg_replace('/^\|/', '', $row) ?? $row;
        $row = preg_replace('/\|$/', '', $row) ?? $row;

        $cells = preg_split('/\|/', $row) ?: [];

        return array_map(
            static fn (string $cell): string => trim($cell) === '' ? '' : self::inline(trim($cell)),
            $cells
        );
    }

    protected static function isTableSeparator(string $line): bool
    {
        return (bool) preg_match('/^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/', trim($line));
    }

    protected static function columnAlignment(string $cell): string
    {
        $cell = trim($cell);

        return match (true) {
            str_starts_with($cell, ':') && str_ends_with($cell, ':') => 'center',
            str_ends_with($cell, ':') => 'right',
            str_starts_with($cell, ':') => 'left',
            default => '',
        };
    }

    protected static function alignmentStyle(?string $alignment): string
    {
        if ($alignment === null || $alignment === '' || $alignment === 'left') {
            return '';
        }

        return ' style="text-align:'.$alignment.'"';
    }
}
