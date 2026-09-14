<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tools\HashGenerateRequest;
use Illuminate\Http\JsonResponse;
use Throwable;

class HashGenerateController extends Controller
{
    /**
     * Hash a plaintext password with bcrypt or Argon2 using PHP's
     * password_hash(), which generates a fresh random salt per call.
     */
    public function __invoke(HashGenerateRequest $request): JsonResponse
    {
        $algorithm = $request->algorithm();

        $constant = match ($algorithm) {
            'bcrypt' => PASSWORD_BCRYPT,
            'argon2i' => PASSWORD_ARGON2I,
            'argon2id' => PASSWORD_ARGON2ID,
        };

        try {
            $hash = password_hash($request->password(), $constant);
        } catch (Throwable) {
            $hash = false;
        }

        if ($hash === false) {
            return response()->json([
                'ok' => false,
                'hash' => null,
                'algorithm' => $algorithm,
                'error' => 'The server could not hash that password.',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'hash' => $hash,
            'algorithm' => $algorithm,
            'error' => null,
        ]);
    }
}
