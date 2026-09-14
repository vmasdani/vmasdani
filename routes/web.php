<?php

use App\Http\Controllers\BlogController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\Tools\HashGenerateController;
use App\Http\Controllers\Tools\HashVerifyController;
use App\Http\Controllers\Tools\IpController;
use App\Http\Controllers\Tools\NmapController;
use App\Http\Controllers\Tools\NslookupController;
use App\Http\Controllers\Tools\PingController;
use App\Http\Controllers\Tools\ToolsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Homepage: the featured ("welcome") post with a big title. Not a list.
Route::get('/', [BlogController::class, 'home'])->name('home');

// Crawler files, generated from the blog and tool sources. Served by Laravel
// (public/robots.txt is removed) so the sitemap URL follows config('app.url').
Route::get('robots.txt', [SitemapController::class, 'robots'])->name('robots');
Route::get('sitemap.xml', [SitemapController::class, 'xml'])->name('sitemap.xml');
Route::get('sitemap.txt', [SitemapController::class, 'txt'])->name('sitemap.txt');

// Blog: rendered from the Markdown files in the /blog folder. Static-first.
Route::get('blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('blog/{slug}', [BlogController::class, 'show'])->name('blog.show');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

// Online utilities. Each has a page; most have a JSON run endpoint while the
// speed test and password tools run entirely in the browser.
// No request throttling here on purpose: DDoS/abuse protection is expected to
// come from Cloudflare in front of the app; the binaries stay bounded by
// Process timeouts in NetworkService.
Route::get('tools', [ToolsController::class, 'index'])->name('tools.index');
Route::get('tools/{tool}', [ToolsController::class, 'show'])->name('tools.show');

Route::get('tools/ping/run', PingController::class)->name('tools.ping.run');
Route::get('tools/nmap/run', NmapController::class)->name('tools.nmap.run');
Route::get('tools/ip/info', IpController::class)->name('tools.ip.info');
Route::get('tools/nslookup/run', NslookupController::class)->name('tools.nslookup.run');
Route::post('tools/hash/verify', HashVerifyController::class)->name('tools.hash.verify');
Route::post('tools/hash/generate', HashGenerateController::class)->name('tools.hash.generate');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
