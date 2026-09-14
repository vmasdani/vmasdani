<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tools\NslookupRequest;
use App\Support\NetworkService;
use Illuminate\Http\JsonResponse;

class NslookupController extends Controller
{
    /**
     * Resolve a host through the server's DNS and return the answer as JSON.
     */
    public function __invoke(NslookupRequest $request): JsonResponse
    {
        $result = NetworkService::nslookup($request->host());

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}
