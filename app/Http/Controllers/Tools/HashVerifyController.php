<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tools\HashVerifyRequest;
use Illuminate\Http\JsonResponse;

class HashVerifyController extends Controller
{
    /**
     * Verify a plaintext password against a stored bcrypt or Argon2 hash.
     * PHP's password_verify() handles every supported algorithm and compares
     * in constant time, so no new dependency is needed on the client.
     */
    public function __invoke(HashVerifyRequest $request): JsonResponse
    {
        $hash = $request->hash();
        $algorithm = $request->algorithm();
        $detected = password_get_info($hash)['algoName'];

        if ($detected === 'unknown') {
            return response()->json([
                'ok' => false,
                'matches' => false,
                'algorithm' => $algorithm,
                'detected' => null,
                'error' => 'That does not look like a valid password hash.',
            ], 422);
        }

        if ($detected !== $algorithm) {
            return response()->json([
                'ok' => false,
                'matches' => false,
                'algorithm' => $algorithm,
                'detected' => $detected,
                'error' => "That hash was produced with {$detected}, not {$algorithm}. Choose the matching algorithm.",
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'matches' => password_verify($request->password(), $hash),
            'algorithm' => $algorithm,
            'detected' => $detected,
            'error' => null,
        ]);
    }
}
