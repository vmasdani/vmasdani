<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Accept only well-formed hostnames and IP addresses. This keeps user input
 * from ever being interpreted as shell syntax by the network tools.
 */
class HostAddress implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $value = is_string($value) ? trim($value) : '';

        if ($value === '') {
            $fail('The :attribute must be a hostname or IP address.');

            return;
        }

        if (filter_var($value, FILTER_VALIDATE_IP) !== false) {
            return;
        }

        $isHostname = (bool) preg_match(
            '/^(?=.*[a-zA-Z0-9])[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/',
            $value
        );

        if (! $isHostname || strlen($value) > 253) {
            $fail('The :attribute must be a valid hostname or IP address.');
        }
    }
}
