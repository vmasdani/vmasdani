<?php

namespace App\Http\Requests\Tools;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HashGenerateRequest extends FormRequest
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
            'algorithm' => ['required', 'string', Rule::in(['bcrypt', 'argon2i', 'argon2id'])],
            'password' => ['required', 'string', 'max:4096'],
        ];
    }

    public function algorithm(): string
    {
        return (string) $this->validated('algorithm');
    }

    public function password(): string
    {
        return (string) $this->validated('password');
    }
}
