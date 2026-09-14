<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tools\NmapRequest;
use App\Support\NetworkService;
use Illuminate\Http\JsonResponse;

class NmapController extends Controller
{
    /**
     * Run a bounded nmap scan from the server and return the results as JSON.
     */
    public function __invoke(NmapRequest $request): JsonResponse
    {
        $result = NetworkService::nmap(
            $request->host(),
            $request->ports(),
            $request->scan(),
        );

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}
