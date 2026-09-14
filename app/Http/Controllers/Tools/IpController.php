<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class IpController extends Controller
{
    /**
     * Report the visitor's public IP and country.
     *
     * The IP comes straight from the request, so it reflects the connection the
     * server sees; geolocation is resolved through a public lookup with no
     * credentials and nothing is stored.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $ip = $request->ip();

        if (blank($ip)) {
            return response()->json([
                'ok' => false,
                'ip' => null,
                'error' => 'We could not determine your IP address.',
            ], 422);
        }

        $isLocal = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;

        if ($isLocal) {
            return response()->json([
                'ok' => true,
                'ip' => $ip,
                'local' => true,
                'country' => null,
                'countryCode' => null,
                'city' => null,
                'isp' => null,
                'note' => 'This is a private or loopback address, so country data is unavailable.',
            ]);
        }

        return $this->lookup($ip);
    }

    protected function lookup(string $ip): JsonResponse
    {
        $response = Http::timeout(5)
            ->acceptJson()
            ->retry(2, 200, throw: false)
            ->get('http://ip-api.com/json/'.$ip.'?fields=status,message,country,countryCode,regionName,city,isp,query');

        if ($response->failed() || $response->json('status') !== 'success') {
            return response()->json([
                'ok' => true,
                'ip' => $ip,
                'local' => false,
                'country' => null,
                'countryCode' => null,
                'city' => null,
                'isp' => null,
                'note' => 'Your IP is visible, but the country lookup is temporarily unavailable.',
            ]);
        }

        return response()->json([
            'ok' => true,
            'ip' => $response->json('query', $ip),
            'local' => false,
            'country' => $response->json('country'),
            'countryCode' => $response->json('countryCode'),
            'region' => $response->json('regionName'),
            'city' => $response->json('city'),
            'isp' => $response->json('isp'),
        ]);
    }
}
