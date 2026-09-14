<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tools\PingRequest;
use App\Support\NetworkService;
use Illuminate\Http\JsonResponse;

class PingController extends Controller
{
    /**
     * Ping a host from the server and return the statistics as JSON.
     */
    public function __invoke(PingRequest $request): JsonResponse
    {
        $result = NetworkService::ping(
            $request->host(),
            $request->pingCount(),
            $request->pingTimeout(),
        );

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}
