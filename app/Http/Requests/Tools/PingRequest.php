<?php

namespace App\Http\Requests\Tools;

use App\Rules\HostAddress;
use Illuminate\Foundation\Http\FormRequest;

class PingRequest extends FormRequest
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
            'count' => ['nullable', 'integer', 'min:1', 'max:4'],
            'timeout' => ['nullable', 'integer', 'min:1', 'max:5'],
        ];
    }

    public function host(): string
    {
        return trim((string) $this->validated('host'));
    }

    public function pingCount(): int
    {
        return (int) ($this->validated('count') ?? 4);
    }

    public function pingTimeout(): int
    {
        return (int) ($this->validated('timeout') ?? 2);
    }
}
