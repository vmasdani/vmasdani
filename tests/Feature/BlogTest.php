<?php

use App\Support\Blog;

beforeEach(function () {
    $this->fixture = Blog::path().'/2020-01-01-99-fixturesample.md';

    file_put_contents($this->fixture, "---\ntitle: \"Fixture Sample\"\ndate: 2020-01-01\ntags: [test]\ninfographic:\n    - \"🔍 Finding the needle\"\n    - Summarizing everything long\n---\n\nHello **world** from a fixture.\n");
});

afterEach(function () {
    if (file_exists($this->fixture)) {
        unlink($this->fixture);
    }
});

it('lists published posts newest first', function () {
    $posts = Blog::all();

    expect($posts)->toBeArray()->and($posts)->not->toBeEmpty();

    $slugs = array_column($posts, 'slug');
    expect($slugs)->toContain('fixturesample');

    // Newest first: the real welcome post (2026) precedes the 2020 fixture.
    expect(array_search('fixturesample', $slugs, true))->toBeGreaterThan(0);
});

it('omits drafts from the listing', function () {
    file_put_contents(Blog::path().'/2020-01-01-98-hidden.md', "---\ntitle: Hidden\ndraft: true\n---\n\nSecret");

    expect(array_column(Blog::all(), 'slug'))->not->toContain('hidden');

    unlink(Blog::path().'/2020-01-01-98-hidden.md');
});

it('reads a single post and renders its markdown body', function () {
    $post = Blog::find('fixturesample');

    expect($post)->not->toBeNull()
        ->and($post['title'])->toBe('Fixture Sample')
        ->and($post['tags'])->toBe(['test'])
        ->and($post['html'])->toContain('<strong>world</strong>');
});

it('returns null for an unknown post', function () {
    expect(Blog::find('does-not-exist'))->toBeNull();
});

it('parses infographic points into emoji and label pairs', function () {
    $post = Blog::find('fixturesample');

    expect($post['infographic'])->toBe([
        ['emoji' => '🔍', 'label' => 'Finding the needle'],
        ['emoji' => '', 'label' => 'Summarizing everything long'],
    ]);
});

it('extracts the first paragraph as the map excerpt', function () {
    $post = Blog::find('fixturesample');

    expect($post['excerpt'])->toBe('Hello world from a fixture.');
});

it('exposes the excerpt on listing summaries', function () {
    $fixture = collect(Blog::all())->firstWhere('slug', 'fixturesample');

    expect($fixture)->not->toBeNull()
        ->and($fixture['excerpt'])->toBe('Hello world from a fixture.')
        ->and($fixture['infographic'])->toHaveCount(2);
});

it('serves the blog listing page', function () {
    $this->get('/blog')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('blog/index', false)->has('posts'));
});

it('shows the featured welcome post on the homepage', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page->component('home', false)
                ->has('post')
                ->where('posts', fn ($posts) => collect($posts)->every(fn ($p) => $p['slug'] !== 'welcome'))
        );
});

it('serves an individual post page', function () {
    $this->get('/blog/fixturesample')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('blog/show', false)->where('post.slug', 'fixturesample'));
});

it('filters posts by search query', function () {
    $this->get('/blog?q=fixture')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('search', 'fixture'));
});

it('returns 404 for unknown posts', function () {
    $this->get('/blog/missing-post')->assertNotFound();
});

it('assigns each post a title emoji', function () {
    $posts = Blog::all();

    expect(array_column($posts, 'emoji'))->each->toBeString()->and($posts[0]['emoji'])->not->toBe('');
});
