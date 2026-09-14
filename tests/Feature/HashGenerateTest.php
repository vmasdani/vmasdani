<?php

it('generates a bcrypt hash for the given password', function () {
    $response = $this->postJson('/tools/hash/generate', [
        'algorithm' => 'bcrypt',
        'password' => 'correct horse battery staple',
    ])
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('algorithm', 'bcrypt');

    $hash = $response->json('hash');

    expect(password_get_info($hash)['algoName'])->toBe('bcrypt')
        ->and(password_verify('correct horse battery staple', $hash))->toBeTrue()
        ->and(password_verify('wrong password', $hash))->toBeFalse();
});

it('generates an argon2id hash', function () {
    $response = $this->postJson('/tools/hash/generate', [
        'algorithm' => 'argon2id',
        'password' => 'correct horse battery staple',
    ])->assertOk();

    $hash = $response->json('hash');

    expect(password_get_info($hash)['algoName'])->toBe('argon2id')
        ->and(password_verify('correct horse battery staple', $hash))->toBeTrue();
});

it('generates an argon2i hash', function () {
    $response = $this->postJson('/tools/hash/generate', [
        'algorithm' => 'argon2i',
        'password' => 'correct horse battery staple',
    ])->assertOk();

    $hash = $response->json('hash');

    expect(password_get_info($hash)['algoName'])->toBe('argon2i')
        ->and(password_verify('correct horse battery staple', $hash))->toBeTrue();
});

it('salts each generated hash differently', function () {
    $payload = ['algorithm' => 'bcrypt', 'password' => 'same password'];

    $first = $this->postJson('/tools/hash/generate', $payload)->json('hash');
    $second = $this->postJson('/tools/hash/generate', $payload)->json('hash');

    expect($first)->not->toBe($second);
});

it('validates the generator input', function () {
    $this->postJson('/tools/hash/generate', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['algorithm', 'password']);

    $this->postJson('/tools/hash/generate', [
        'algorithm' => 'md5',
        'password' => 'secret',
    ])->assertJsonValidationErrors('algorithm');
});
