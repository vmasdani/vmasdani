<?php

use Illuminate\Support\Facades\Http;

it('renders each tool page', function (string $tool) {
    $this->get('/tools/'.$tool)->assertOk()->assertInertia(fn ($page) => $page->component('tools/'.$tool, false));
})->with([
    'ping',
    'nmap',
    'nslookup',
    'ip',
    'dns-propagation',
    'speedtest',
    'password-strength',
    'base64',
    'url-encode',
    'hash',
    'password-generator',
    'uuid',
    'timestamp',
    'qr-code',
    'background-remover',
    'image-base64',
    'image-compressor',
    'image-converter',
    'exif-metadata',
    'background-blur',
    'ocr',
    'face-blur',
    'barcode-scanner',
    'license-plate',
    'pdf-merge',
    'pdf-split',
    'images-to-pdf',
]);

it('renders the tools landing page', function () {
    $this->get('/tools')->assertOk()->assertInertia(fn ($page) => $page->component('tools/index', false));
});

it('returns 404 for an unknown tool page', function () {
    $this->get('/tools/secret')->assertNotFound();
});

it('lists every tool and post in the xml sitemap', function () {
    $response = $this->get('/sitemap.xml')->assertOk();

    $response->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

    expect($response->getContent())
        ->toContain('<urlset')
        ->toContain(url('/tools/password-strength'))
        ->toContain(url('/blog/welcome'));
});

it('lists every url line by line in the text sitemap', function () {
    $response = $this->get('/sitemap.txt')->assertOk();

    $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');

    $lines = array_filter(explode("\n", trim($response->getContent())));

    expect($lines)->toContain(url('/'))
        ->toContain(url('/tools'))
        ->toContain(url('/tools/ping'));
});

it('serves robots.txt pointing at the sitemap', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertSee('Sitemap: '.url('/sitemap.xml'), false)
        ->assertSee('Disallow: /dashboard', false);
});

it('rejects a malformed host for the ping endpoint', function () {
    $this->getJson('/tools/ping/run?host='.urlencode('127.0.0.1; rm -rf /'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('host');
});

it('rejects shell metacharacters in the host', function () {
    $this->getJson('/tools/ping/run?host='.urlencode('`whoami`'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('host');
});

it('rejects invalid port specifications for nmap', function () {
    $this->getJson('/tools/nmap/run?host=example.com&ports='.urlencode('80; nc evil'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('ports');
});

it('rejects out-of-range ping counts', function () {
    $this->getJson('/tools/ping/run?host=example.com&count=999')
        ->assertStatus(422)
        ->assertJsonValidationErrors('count');
});

it('rejects ping counts above the maximum of four', function () {
    $this->getJson('/tools/ping/run?host=example.com&count=5')
        ->assertStatus(422)
        ->assertJsonValidationErrors('count');
});

it('rejects a malformed host for the nslookup endpoint', function () {
    $this->getJson('/tools/nslookup/run?host='.urlencode('$(whoami).com'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('host');
});

it('scans a local tcp port without the nmap binary', function () {
    $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
    $name = stream_socket_get_name($server, false);
    $port = (int) substr($name, strrpos($name, ':') + 1);

    $this->getJson('/tools/nmap/run?host=127.0.0.1&ports='.$port)
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('ports.0.port', (string) $port)
        ->assertJsonPath('ports.0.state', 'open');

    fclose($server);
});

it('reports a private ip without a geolocation lookup', function () {
    Http::fake();

    $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
        ->get('/tools/ip/info')
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('ip', '127.0.0.1')
        ->assertJsonPath('local', true);

    Http::assertNothingSent();
});

it('geolocates a public ip through the lookup service', function () {
    Http::fake([
        'ip-api.com/*' => Http::response([
            'status' => 'success',
            'country' => 'Indonesia',
            'countryCode' => 'ID',
            'regionName' => 'Jakarta',
            'city' => 'Jakarta',
            'isp' => 'Example ISP',
            'query' => '8.8.8.8',
        ]),
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
        ->get('/tools/ip/info')
        ->assertOk()
        ->assertJsonPath('country', 'Indonesia')
        ->assertJsonPath('countryCode', 'ID');

    Http::assertSent(fn ($request) => str_contains($request->url(), '8.8.8.8'));
});
