import { answerKey, buildResolverUrl, checkPropagation, parseDohJson, summarize, type DnsResolver, type ResolverResult } from '@/lib/dns-propagation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const resolver: DnsResolver = { id: 'test', name: 'Test', location: 'Nowhere', url: 'https://dns.example/dns-query' };

function result(overrides: Partial<ResolverResult>): ResolverResult {
    return { id: 'x', name: 'X', location: 'Y', status: 'ok', answers: [], message: null, durationMs: 1, ...overrides };
}

describe('buildResolverUrl', () => {
    it('adds the name and type as query parameters', () => {
        expect(buildResolverUrl(resolver, 'example.com', 'A')).toBe('https://dns.example/dns-query?name=example.com&type=A');
    });
});

describe('parseDohJson', () => {
    it('returns the matching records and ignores other types like RRSIG', () => {
        const parsed = parseDohJson(
            {
                Status: 0,
                Answer: [
                    { name: 'example.com', type: 1, TTL: 288, data: '172.66.147.243' },
                    { name: 'example.com', type: 46, TTL: 288, data: 'RRSIG...' },
                ],
            },
            'A',
        );

        expect(parsed.status).toBe('ok');
        expect(parsed.answers).toEqual(['172.66.147.243']);
    });

    it('lower-cases AAAA records', () => {
        const parsed = parseDohJson({ Status: 0, Answer: [{ type: 28, data: '2606:4700:0000::6812:1599' }] }, 'AAAA');

        expect(parsed.answers).toEqual(['2606:4700:0000::6812:1599']);
    });

    it('strips quotes from TXT and trailing dots from MX/CNAME/NS', () => {
        expect(parseDohJson({ Status: 0, Answer: [{ type: 16, data: '"v=spf1 -all"' }] }, 'TXT').answers).toEqual(['v=spf1 -all']);
        expect(parseDohJson({ Status: 0, Answer: [{ type: 15, data: '10 mail.example.com.' }] }, 'MX').answers).toEqual(['10 mail.example.com']);
        expect(parseDohJson({ Status: 0, Answer: [{ type: 5, data: 'target.example.com.' }] }, 'CNAME').answers).toEqual(['target.example.com']);
        expect(parseDohJson({ Status: 0, Answer: [{ type: 2, data: 'ns1.example.com.' }] }, 'NS').answers).toEqual(['ns1.example.com']);
    });

    it('reports an empty answer list', () => {
        expect(parseDohJson({ Status: 0, Answer: [] }, 'A')).toMatchObject({ status: 'empty', answers: [] });
        expect(parseDohJson({ Status: 0 }, 'A')).toMatchObject({ status: 'empty', answers: [] });
    });

    it('reports NXDOMAIN and other rcode failures', () => {
        expect(parseDohJson({ Status: 3 }, 'A')).toMatchObject({ status: 'empty' });
        expect(parseDohJson({ Status: 2 }, 'A')).toMatchObject({ status: 'error' });
    });

    it('reports a malformed response', () => {
        expect(parseDohJson('nope', 'A')).toMatchObject({ status: 'error' });
        expect(parseDohJson(null, 'A')).toMatchObject({ status: 'error' });
    });
});

describe('answerKey', () => {
    it('is order-independent and case-insensitive for host records', () => {
        expect(answerKey('A', ['1.1.1.1', '2.2.2.2'])).toBe(answerKey('A', ['2.2.2.2', '1.1.1.1']));
        expect(answerKey('CNAME', ['Example.com'])).toBe(answerKey('CNAME', ['example.com']));
    });
});

describe('summarize', () => {
    it('marks a result set with one distinct answer as propagated', () => {
        const outcome = summarize(
            [result({ id: 'a', answers: ['1.1.1.1'] }), result({ id: 'b', answers: ['1.1.1.1'] }), result({ id: 'c', answers: ['1.1.1.1'] })],
            'A',
        );

        expect(outcome.propagated).toBe(true);
        expect(outcome.consensus).toEqual(['1.1.1.1']);
        expect(outcome.consensusCount).toBe(3);
        expect(outcome.distinct).toBe(1);
    });

    it('flags the minority answer as not propagated', () => {
        const outcome = summarize(
            [result({ id: 'a', answers: ['1.1.1.1'] }), result({ id: 'b', answers: ['1.1.1.1'] }), result({ id: 'c', answers: ['9.9.9.9'] })],
            'A',
        );

        expect(outcome.propagated).toBe(false);
        expect(outcome.consensus).toEqual(['1.1.1.1']);
        expect(outcome.consensusCount).toBe(2);
        expect(outcome.answered).toBe(3);
        expect(outcome.distinct).toBe(2);
    });

    it('ignores resolvers that returned no records or errored', () => {
        const outcome = summarize(
            [
                result({ id: 'a', answers: ['1.1.1.1'] }),
                result({ id: 'b', status: 'empty', answers: [] }),
                result({ id: 'c', status: 'error', answers: [] }),
            ],
            'A',
        );

        expect(outcome.answered).toBe(1);
        expect(outcome.propagated).toBe(true);
    });
});

describe('checkPropagation / queryResolver', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('queries every resolver and parses each response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ Status: 0, Answer: [{ type: 1, data: '1.1.1.1' }] }),
                } as Response),
            ),
        );

        const results = await checkPropagation('example.com', 'A', [resolver]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ id: 'test', status: 'ok', answers: ['1.1.1.1'] });
        expect(fetch).toHaveBeenCalledWith('https://dns.example/dns-query?name=example.com&type=A', expect.objectContaining({}));
    });

    it('marks a non-ok HTTP response as an error', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: false, status: 502 } as Response)),
        );

        const [first] = await checkPropagation('example.com', 'A', [resolver]);

        expect(first.status).toBe('error');
        expect(first.message).toBe('HTTP 502');
    });

    it('marks a thrown request as an error', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new Error('blocked'))),
        );

        const [first] = await checkPropagation('example.com', 'A', [resolver]);

        expect(first.status).toBe('error');
        expect(first.message).toBe('Could not reach the resolver.');
    });
});
