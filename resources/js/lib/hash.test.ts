import { hashAll, hashText, toHex } from '@/lib/hash';
import { describe, expect, it } from 'vitest';

describe('hashText', () => {
    it('matches the known SHA-1 vector for "abc"', async () => {
        expect(await hashText('abc', 'SHA-1')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    });

    it('matches the known SHA-256 vector for "abc"', async () => {
        expect(await hashText('abc', 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('matches the known SHA-384 and SHA-512 vectors for "abc"', async () => {
        expect(await hashText('abc', 'SHA-384')).toBe(
            'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
        );
        expect(await hashText('abc', 'SHA-512')).toBe(
            'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
        );
    });

    it('hashes multi-byte text as UTF-8', async () => {
        expect(await hashText('é', 'SHA-256')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
    });
});

describe('toHex', () => {
    it('renders bytes as lower-case hex', () => {
        expect(toHex(Uint8Array.of(0, 15, 16, 255).buffer)).toBe('000f10ff');
    });
});

describe('hashAll', () => {
    it('returns every supported algorithm', async () => {
        const result = await hashAll('abc');

        expect(Object.keys(result).sort()).toEqual(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']);
        expect(result['SHA-256']).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });
});
