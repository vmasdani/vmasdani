<?php

namespace App\Http\Requests\Tools;

use App\Rules\HostAddress;
use Illuminate\Foundation\Http\FormRequest;

class NslookupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'host' => ['required', 'string', 'max:253', new HostAddress],
        ];
    }

    public function host(): string
    {
        return trim((string) $this->validated('host'));
    }
}
