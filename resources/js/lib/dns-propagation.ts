/**
 * DNS propagation checking over DNS-over-HTTPS (DoH) JSON APIs. Every query
 * runs in the browser against public resolvers that send CORS headers, so no
 * server request is needed. Only resolvers exposing an application/dns-json
 * endpoint are usable here; wire-format-only resolvers cannot be read directly.
 */

export const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] as const;

export type DnsRecordType = (typeof DNS_RECORD_TYPES)[number];

const TYPE_NUMBERS: Record<DnsRecordType, number> = {
    A: 1,
    NS: 2,
    CNAME: 5,
    MX: 15,
    TXT: 16,
    AAAA: 28,
};

export interface DnsResolver {
    id: string;
    name: string;
    location: string;
    /** Base DoH JSON endpoint, without query parameters. */
    url: string;
}

export const DNS_RESOLVERS: DnsResolver[] = [
    { id: 'google', name: 'Google Public DNS', location: 'Global', url: 'https://dns.google/resolve' },
    { id: 'cloudflare', name: 'Cloudflare', location: 'Global', url: 'https://cloudflare-dns.com/dns-query' },
    { id: 'dnssb', name: 'DNS.SB', location: 'Switzerland', url: 'https://doh.sb/dns-query' },
    { id: 'tiar', name: 'Tiar.app', location: 'Singapore', url: 'https://doh.tiar.app/dns-query' },
    { id: 'alidns', name: 'Alibaba AliDNS', location: 'China', url: 'https://dns.alidns.com/resolve' },
];

export type ResolverStatus = 'ok' | 'empty' | 'error';

export interface ResolverResult {
    id: string;
    name: string;
    location: string;
    status: ResolverStatus;
    answers: string[];
    message: string | null;
    durationMs: number;
}

export interface DohAnswer {
    name?: string;
    type: number;
    TTL?: number;
    data: string;
}

interface DohResponse {
    Status: number;
    Answer?: DohAnswer[];
}

export function buildResolverUrl(resolver: DnsResolver, name: string, recordType: DnsRecordType): string {
    const url = new URL(resolver.url);

    url.searchParams.set('name', name);
    url.searchParams.set('type', recordType);

    return url.toString();
}

export function parseDohJson(body: unknown, recordType: DnsRecordType): Pick<ResolverResult, 'status' | 'answers' | 'message'> {
    const response = body as Partial<DohResponse> | null;

    if (response === null || typeof response !== 'object' || typeof response.Status !== 'number') {
        return { status: 'error', answers: [], message: 'Malformed DNS response.' };
    }

    if (response.Status === 3) {
        return { status: 'empty', answers: [], message: 'NXDOMAIN (name does not exist).' };
    }

    if (response.Status !== 0) {
        return { status: 'error', answers: [], message: `DNS error (rcode ${response.Status}).` };
    }

    const wanted = TYPE_NUMBERS[recordType];
    const answers = (response.Answer ?? []).filter((answer) => answer.type === wanted).map((answer) => formatRecord(recordType, answer.data));

    if (answers.length === 0) {
        return { status: 'empty', answers: [], message: 'No records returned.' };
    }

    return { status: 'ok', answers, message: null };
}

function formatRecord(recordType: DnsRecordType, data: string): string {
    const trimmed = data.trim();

    if (recordType === 'TXT') {
        return trimmed.replace(/^"(.*)"$/s, '$1');
    }

    if (recordType === 'CNAME' || recordType === 'NS' || recordType === 'MX') {
        return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
    }

    if (recordType === 'AAAA') {
        return trimmed.toLowerCase();
    }

    return trimmed;
}

/** Order-independent key so resolvers returning the same records group together. */
export function answerKey(recordType: DnsRecordType, answers: string[]): string {
    return answers
        .map((answer) => (recordType === 'TXT' ? answer : answer.toLowerCase()))
        .sort()
        .join('|');
}

export interface PropagationOutcome {
    results: ResolverResult[];
    consensus: string[];
    consensusCount: number;
    answered: number;
    distinct: number;
    propagated: boolean;
}

export function summarize(results: ResolverResult[], recordType: DnsRecordType): PropagationOutcome {
    const answered = results.filter((result) => result.status === 'ok');
    const groups = new Map<string, { answers: string[]; count: number }>();

    for (const result of answered) {
        const key = answerKey(recordType, result.answers);
        const group = groups.get(key);

        if (group) {
            group.count += 1;
        } else {
            groups.set(key, { answers: result.answers, count: 1 });
        }
    }

    let consensus: string[] = [];
    let consensusCount = 0;

    for (const group of groups.values()) {
        if (group.count > consensusCount) {
            consensus = group.answers;
            consensusCount = group.count;
        }
    }

    return {
        results,
        consensus,
        consensusCount,
        answered: answered.length,
        distinct: groups.size,
        propagated: answered.length > 0 && groups.size === 1,
    };
}

export async function queryResolver(resolver: DnsResolver, name: string, recordType: DnsRecordType, timeoutMs = 6000): Promise<ResolverResult> {
    const started = Date.now();
    const base = { id: resolver.id, name: resolver.name, location: resolver.location };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(buildResolverUrl(resolver, name, recordType), {
            headers: { Accept: 'application/dns-json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            return { ...base, status: 'error', answers: [], message: `HTTP ${response.status}`, durationMs: Date.now() - started };
        }

        const body: unknown = await response.json();

        return { ...base, ...parseDohJson(body, recordType), durationMs: Date.now() - started };
    } catch (exception) {
        const message = exception instanceof DOMException && exception.name === 'AbortError' ? 'Timed out.' : 'Could not reach the resolver.';

        return { ...base, status: 'error', answers: [], message, durationMs: Date.now() - started };
    } finally {
        clearTimeout(timer);
    }
}

export async function checkPropagation(
    name: string,
    recordType: DnsRecordType,
    resolvers: DnsResolver[] = DNS_RESOLVERS,
    timeoutMs = 6000,
): Promise<ResolverResult[]> {
    return Promise.all(resolvers.map((resolver) => queryResolver(resolver, name, recordType, timeoutMs)));
}
