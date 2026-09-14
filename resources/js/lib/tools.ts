import {
    BinocularsIcon,
    BracketsAngleIcon,
    BroadcastIcon,
    ClockIcon,
    GlobeHemisphereWestIcon,
    HashIcon,
    IdentificationCardIcon,
    KeyIcon,
    LinkIcon,
    LockKeyIcon,
    MagnifyingGlassIcon,
    QrCodeIcon,
    ScissorsIcon,
    SpeedometerIcon,
    WifiHighIcon,
    type Icon,
} from '@phosphor-icons/react';

export type ToolCategory = 'Network' | 'Security' | 'Encoding' | 'Generators' | 'Time' | 'Images';

export interface ToolDefinition {
    slug: string;
    title: string;
    description: string;
    icon: Icon;
    category: ToolCategory;
    tags: string[];
}

export const toolCategories: { id: ToolCategory; label: string }[] = [
    { id: 'Network', label: 'Network' },
    { id: 'Security', label: 'Security' },
    { id: 'Encoding', label: 'Encoding' },
    { id: 'Generators', label: 'Generators' },
    { id: 'Time', label: 'Time' },
    { id: 'Images', label: 'Images' },
];

/**
 * The single source of truth for the utilities. The landing page, its search,
 * the sidebar and the header title all read from here, so adding a tool means
 * one entry plus its page component.
 */
export const tools: ToolDefinition[] = [
    {
        slug: 'ping',
        title: 'Ping',
        description: 'Measure latency and packet loss to any host straight from the server.',
        icon: WifiHighIcon,
        category: 'Network',
        tags: ['latency', 'icmp', 'rtt', 'packet loss', 'host', 'reachability'],
    },
    {
        slug: 'speedtest',
        title: 'Speed Test',
        description: 'Measure your download, upload and latency in the browser against Cloudflare.',
        icon: SpeedometerIcon,
        category: 'Network',
        tags: ['bandwidth', 'download', 'upload', 'mbps', 'internet', 'cloudflare'],
    },
    {
        slug: 'nmap',
        title: 'Port Scanner',
        description: 'Discover open ports with a pure-PHP TCP connect scan and banner grabbing.',
        icon: BinocularsIcon,
        category: 'Network',
        tags: ['port', 'scan', 'nmap', 'tcp', 'banner', 'service'],
    },
    {
        slug: 'nslookup',
        title: 'DNS Lookup',
        description: 'Resolve any hostname with nslookup straight from the server.',
        icon: MagnifyingGlassIcon,
        category: 'Network',
        tags: ['dns', 'resolve', 'nslookup', 'domain', 'hostname', 'a record'],
    },
    {
        slug: 'ip',
        title: 'Check My IP',
        description: 'See the public IP address and country this site sees you from.',
        icon: GlobeHemisphereWestIcon,
        category: 'Network',
        tags: ['ip', 'address', 'geolocation', 'country', 'isp', 'my ip'],
    },
    {
        slug: 'dns-propagation',
        title: 'DNS Propagation Checker',
        description: 'Query public DNS resolvers from your browser and see whether a record has propagated.',
        icon: BroadcastIcon,
        category: 'Network',
        tags: ['dns', 'propagation', 'resolver', 'doh', 'nameserver', 'ttl', 'propagated'],
    },
    {
        slug: 'password-strength',
        title: 'Password Strength',
        description: 'Score a password and check whether it has appeared in known data breaches.',
        icon: LockKeyIcon,
        category: 'Security',
        tags: ['password', 'strength', 'entropy', 'breach', 'security', 'pwned'],
    },
    {
        slug: 'base64',
        title: 'Base64 Encode / Decode',
        description: 'Encode text to Base64 or decode it back, including the URL-safe variant.',
        icon: BracketsAngleIcon,
        category: 'Encoding',
        tags: ['base64', 'encode', 'decode', 'url-safe', 'text', 'binary'],
    },
    {
        slug: 'url-encode',
        title: 'URL Encode / Decode',
        description: 'Percent-encode text for URLs or decode an encoded string back to plain text.',
        icon: LinkIcon,
        category: 'Encoding',
        tags: ['url', 'encode', 'decode', 'percent', 'uri', 'escape'],
    },
    {
        slug: 'hash',
        title: 'Hash Generator',
        description: 'Generate SHA-1/256/384/512 hashes and create or verify bcrypt and Argon2 password hashes.',
        icon: HashIcon,
        category: 'Encoding',
        tags: ['hash', 'sha1', 'sha256', 'sha512', 'checksum', 'digest', 'bcrypt', 'argon2', 'password verify'],
    },
    {
        slug: 'password-generator',
        title: 'Password Generator',
        description: 'Create strong random passwords with control over length and character sets.',
        icon: KeyIcon,
        category: 'Generators',
        tags: ['password', 'generate', 'random', 'secure', 'strong', 'passphrase'],
    },
    {
        slug: 'uuid',
        title: 'UUID / ULID Generator',
        description: 'Generate UUID v4, time-ordered UUID v7 and ULIDs in bulk.',
        icon: IdentificationCardIcon,
        category: 'Generators',
        tags: ['uuid', 'ulid', 'guid', 'v4', 'v7', 'identifier'],
    },
    {
        slug: 'qr-code',
        title: 'QR Code Generator',
        description: 'Create a QR code for any text or URL and download it as SVG or PNG.',
        icon: QrCodeIcon,
        category: 'Generators',
        tags: ['qr', 'qr code', 'barcode', 'generator', 'url', 'download'],
    },
    {
        slug: 'timestamp',
        title: 'Unix Timestamp Converter',
        description: 'Convert between Unix timestamps, ISO 8601 and local time.',
        icon: ClockIcon,
        category: 'Time',
        tags: ['unix', 'timestamp', 'epoch', 'iso 8601', 'date', 'time'],
    },
    {
        slug: 'background-remover',
        title: 'Background Remover',
        description: 'Cut the subject out of any photo with an AI model that runs entirely in your browser.',
        icon: ScissorsIcon,
        category: 'Images',
        tags: ['background', 'remove', 'cutout', 'subject', 'transparent', 'png', 'ai', 'erase', 'photo'],
    },
];

export function toolPath(slug: string): string {
    return `/tools/${slug}`;
}

/**
 * Match a path like /tools/ping to its definition. Falls back to the first
 * path segment so sub-paths stay highlighted in the sidebar.
 */
export function toolForPath(path: string): ToolDefinition | undefined {
    const slug = path
        .replace(/^\/tools\//, '')
        .split('/')[0]
        .split('?')[0];

    return tools.find((tool) => tool.slug === slug);
}

export function searchTools(query: string): ToolDefinition[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
        return tools;
    }

    return tools.filter((tool) => {
        const haystack = [tool.title, tool.description, tool.category, ...tool.tags].join(' ').toLowerCase();

        return terms.every((term) => haystack.includes(term));
    });
}
