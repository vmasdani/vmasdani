<?php

it('verifies a password against a bcrypt hash', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'bcrypt',
        'hash' => '$2y$10$aOMXz/qTeCXgDDQ.CS.hOuRHd0vCASpSSdi4OrCi7fEeISSZKA1va',
        'password' => 'correct horse battery staple',
    ])
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('matches', true)
        ->assertJsonPath('detected', 'bcrypt');
});

it('reports a non-matching bcrypt password', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'bcrypt',
        'hash' => '$2y$10$aOMXz/qTeCXgDDQ.CS.hOuRHd0vCASpSSdi4OrCi7fEeISSZKA1va',
        'password' => 'wrong password',
    ])
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('matches', false);
});

it('verifies a password against an argon2id hash', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'argon2id',
        'hash' => '$argon2id$v=19$m=65536,t=4,p=1$cW5PVHM1SlZ6MTRNaERuLg$h7bpVzXjdmfvWBWpYSeYxZE0+HujO7oKFMKH+lpLNDs',
        'password' => 'correct horse battery staple',
    ])
        ->assertOk()
        ->assertJsonPath('matches', true)
        ->assertJsonPath('detected', 'argon2id');
});

it('verifies a password against an argon2i hash', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'argon2i',
        'hash' => '$argon2i$v=19$m=65536,t=4,p=1$dGpTb1pXQ1dGbTZkTGhHSQ$6TPWgNVsCuT/DCb6aRrDL2yBJygtcnooCwXXEdiAwbg',
        'password' => 'correct horse battery staple',
    ])
        ->assertOk()
        ->assertJsonPath('matches', true)
        ->assertJsonPath('detected', 'argon2i');
});

it('rejects a hash that does not match the selected algorithm', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'argon2id',
        'hash' => '$2y$10$aOMXz/qTeCXgDDQ.CS.hOuRHd0vCASpSSdi4OrCi7fEeISSZKA1va',
        'password' => 'correct horse battery staple',
    ])
        ->assertStatus(422)
        ->assertJsonPath('ok', false)
        ->assertJsonPath('detected', 'bcrypt');
});

it('rejects an unrecognised hash', function () {
    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'bcrypt',
        'hash' => 'not-a-hash',
        'password' => 'whatever',
    ])
        ->assertStatus(422)
        ->assertJsonPath('ok', false)
        ->assertJsonPath('detected', null);
});

it('validates the verifier input', function () {
    $this->postJson('/tools/hash/verify', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['algorithm', 'hash', 'password']);

    $this->postJson('/tools/hash/verify', [
        'algorithm' => 'md5',
        'hash' => 'x',
        'password' => 'y',
    ])->assertJsonValidationErrors('algorithm');
});
