<?php

namespace App\Http\Controllers;

use App\Support\Blog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    /**
     * The homepage: a map of every post, each card opening with the post's
     * first paragraph instead of its "at a glance" infographic.
     */
    public function home(): Response
    {
        $featured = Blog::find('welcome') ?? collect(Blog::all())->first();

        // The listing summaries lack the rendered body, so fetch the full post.
        if ($featured !== null && ! array_key_exists('html', $featured)) {
            $featured = Blog::find($featured['slug']);
        }

        $posts = array_values(array_filter(
            Blog::all(),
            static fn (array $post): bool => $featured === null || $post['slug'] !== $featured['slug']
        ));

        return Inertia::render('home', [
            'post' => $featured,
            'posts' => $posts,
        ]);
    }

    /**
     * List every published post, newest first.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));

        $posts = Blog::all();

        if ($search !== '') {
            $needle = mb_strtolower($search);

            $posts = array_values(array_filter(
                $posts,
                static fn (array $post): bool => str_contains(mb_strtolower($post['title'].$post['description']), $needle)
            ));
        }

        return Inertia::render('blog/index', [
            'posts' => $posts,
            'search' => $search,
        ]);
    }

    /**
     * Show a single post as rendered Markdown.
     */
    public function show(string $slug): Response
    {
        $post = Blog::find($slug);

        abort_if($post === null || $post['draft'], 404);

        return Inertia::render('blog/show', [
            'post' => $post,
        ]);
    }
}
