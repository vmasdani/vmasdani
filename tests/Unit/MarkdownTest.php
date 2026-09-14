<?php

use App\Support\Markdown;

it('parses front matter into structured metadata', function () {
    $document = "---\ntitle: Hello\ndate: 2026-01-02\ntags: [php, blog]\ndraft: false\n---\n# Body";

    $parsed = Markdown::parse($document);

    expect($parsed['frontMatter'])
        ->toBeArray()
        ->and($parsed['frontMatter']['title'])->toBe('Hello')
        ->and($parsed['frontMatter']['date'])->toBe('2026-01-02')
        ->and($parsed['frontMatter']['tags'])->toBe(['php', 'blog'])
        ->and($parsed['frontMatter']['draft'])->toBeFalse();
});

it('renders headings, emphasis and lists', function () {
    $html = Markdown::render("# Title\n\nSome **bold**, *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second");

    expect($html)
        ->toContain('<h1>Title</h1>')
        ->toContain('<strong>bold</strong>')
        ->toContain('<em>italic</em>')
        ->toContain('<code>code</code>')
        ->toContain('<ul><li>one</li><li>two</li></ul>')
        ->toContain('<ol><li>first</li><li>second</li></ol>');
});

it('renders fenced code blocks with an optional language', function () {
    $html = Markdown::render("```php\n<?php echo 'hi';\n```");

    expect($html)->toContain('<pre><code class="language-php">');
});

it('escapes raw html to prevent script injection', function () {
    $html = Markdown::render('<script>alert("xss")</script>');

    expect($html)->not->toContain('<script>')
        ->and($html)->toContain('&lt;script&gt;');
});

it('renders markdown links and images', function () {
    $html = Markdown::render('[Site](https://example.com) ![Logo](/logo.png)');

    expect($html)
        ->toContain('<a href="https://example.com" rel="noopener noreferrer">Site</a>')
        ->toContain('<img src="/logo.png" alt="Logo">');
});

it('drops dangerous javascript link schemes', function () {
    $html = Markdown::inline('[click](javascript:alert(1))');

    expect($html)->not->toContain('javascript:');
});

it('renders tables', function () {
    $html = Markdown::render("| a | b |\n|---|---|\n| 1 | 2 |");

    expect($html)
        ->toContain('<table>')
        ->toContain('<th>a</th>')
        ->toContain('<td>1</td>');
});
