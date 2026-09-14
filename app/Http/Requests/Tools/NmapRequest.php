<?php

namespace App\Http\Requests\Tools;

use App\Rules\HostAddress;
use Illuminate\Foundation\Http\FormRequest;

class NmapRequest extends FormRequest
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
            'ports' => ['nullable', 'string', 'max:64', 'regex:/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/'],
            'scan' => ['nullable', 'string', 'in:syn,tcp,version'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $host = is_string($this->query('host')) ? trim((string) $this->query('host')) : $this->query('host');
        $ports = is_string($this->query('ports')) ? trim((string) $this->query('ports')) : $this->query('ports');

        $this->merge([
            'host' => $host === '' ? null : $host,
            'ports' => $ports === '' ? null : $ports,
        ]);
    }

    public function host(): string
    {
        return trim((string) $this->validated('host'));
    }

    public function ports(): ?string
    {
        $ports = $this->validated('ports');

        return is_string($ports) && $ports !== '' ? $ports : null;
    }

    public function scan(): string
    {
        return (string) ($this->validated('scan') ?? 'tcp');
    }
}
