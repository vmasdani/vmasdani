import {
    ApertureIcon,
    ArrowsClockwiseIcon,
    BarcodeIcon,
    BinocularsIcon,
    BracketsAngleIcon,
    BroadcastIcon,
    CarIcon,
    ClockIcon,
    FileImageIcon,
    FilePdfIcon,
    GlobeHemisphereWestIcon,
    HashIcon,
    IdentificationCardIcon,
    KeyIcon,
    LinkIcon,
    LockKeyIcon,
    MagnifyingGlassIcon,
    QrCodeIcon,
    ResizeIcon,
    ScissorsIcon,
    ShieldCheckIcon,
    SmileyIcon,
    SpeedometerIcon,
    StackSimpleIcon,
    TextAaIcon,
    WifiHighIcon,
    type Icon,
} from '@phosphor-icons/react';

export type ToolCategory = 'Network' | 'Security' | 'Encoding' | 'Generators' | 'Time' | 'Images' | 'Smart Utilities' | 'PDF';

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
    { id: 'Smart Utilities', label: 'Smart Utilities' },
    { id: 'PDF', label: 'PDF' },
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
        slug: 'image-base64',
        title: 'Image to Base64',
        description: 'Convert an image to a Base64 data URL, or decode a data URL back into an image.',
        icon: FileImageIcon,
        category: 'Images',
        tags: ['image', 'base64', 'data url', 'encode', 'decode', 'inline', 'css'],
    },
    {
        slug: 'image-compressor',
        title: 'Image Compressor',
        description: 'Resize and compress one or many images in your browser, with a live size comparison.',
        icon: ResizeIcon,
        category: 'Images',
        tags: ['image', 'compress', 'resize', 'optimize', 'jpeg', 'webp', 'avif', 'reduce size', 'bulk'],
    },
    {
        slug: 'image-converter',
        title: 'Image Converter',
        description: 'Convert images between PNG, JPEG, WebP and AVIF without uploading them anywhere.',
        icon: ArrowsClockwiseIcon,
        category: 'Images',
        tags: ['image', 'convert', 'png', 'jpeg', 'webp', 'avif', 'format', 'transcode'],
    },
    {
        slug: 'exif-metadata',
        title: 'EXIF Viewer & Remover',
        description: 'Inspect the metadata hidden in a photo, then strip it losslessly before you share it.',
        icon: ShieldCheckIcon,
        category: 'Images',
        tags: ['exif', 'metadata', 'gps', 'privacy', 'strip', 'remove', 'camera', 'photo'],
    },
    {
        slug: 'background-remover',
        title: 'Background Remover',
        description: 'Cut the subject out of any photo with an AI model that runs entirely in your browser.',
        icon: ScissorsIcon,
        category: 'Smart Utilities',
        tags: ['background', 'remove', 'cutout', 'subject', 'transparent', 'png', 'ai', 'erase', 'photo'],
    },
    {
        slug: 'background-blur',
        title: 'Background Blur',
        description: 'Blur or replace the background of a photo using the on-device AI cutout model.',
        icon: ApertureIcon,
        category: 'Smart Utilities',
        tags: ['background', 'blur', 'portrait', 'depth', 'bokeh', 'ai', 'photo', 'cutout'],
    },
    {
        slug: 'ocr',
        title: 'Image to Text (OCR)',
        description: 'Extract selectable text from an image or screenshot with an OCR engine that runs on your device.',
        icon: TextAaIcon,
        category: 'Smart Utilities',
        tags: ['ocr', 'text', 'image', 'screenshot', 'extract', 'scan', 'recognize', 'tesseract'],
    },
    {
        slug: 'face-blur',
        title: 'Face Blur',
        description: 'Detect faces in a photo and blur or pixelate them on-device before sharing it.',
        icon: SmileyIcon,
        category: 'Smart Utilities',
        tags: ['face', 'blur', 'redact', 'privacy', 'pixelate', 'detect', 'anonymize', 'photo'],
    },
    {
        slug: 'barcode-scanner',
        title: 'Barcode & QR Scanner',
        description: 'Scan QR codes and barcodes from your camera or an image file, entirely in the browser.',
        icon: BarcodeIcon,
        category: 'Smart Utilities',
        tags: ['barcode', 'qr', 'scanner', 'camera', 'ean', 'code128', 'datamatrix', 'pdf417', 'scan'],
    },
    {
        slug: 'license-plate',
        title: 'License Plate Blur & Reader',
        description: 'Detect license plates in a photo, read them and blur them out for privacy, all on-device.',
        icon: CarIcon,
        category: 'Smart Utilities',
        tags: ['license plate', 'anpr', 'alpr', 'blur', 'redact', 'car', 'privacy', 'detect', 'read'],
    },
    {
        slug: 'pdf-merge',
        title: 'Merge PDF',
        description: 'Combine multiple PDFs into one, in the order you choose, without uploading them.',
        icon: StackSimpleIcon,
        category: 'PDF',
        tags: ['pdf', 'merge', 'combine', 'join', 'concatenate', 'documents'],
    },
    {
        slug: 'pdf-split',
        title: 'Split PDF',
        description: 'Extract a page range into a new PDF or split every page into its own file, and rotate as you go.',
        icon: ScissorsIcon,
        category: 'PDF',
        tags: ['pdf', 'split', 'extract', 'pages', 'range', 'separate', 'rotate'],
    },
    {
        slug: 'images-to-pdf',
        title: 'Images to PDF',
        description: 'Turn a set of images into a single PDF, one per page, with a choice of page size and margins.',
        icon: FilePdfIcon,
        category: 'PDF',
        tags: ['pdf', 'images', 'jpg', 'png', 'convert', 'pages', 'scan', 'photos'],
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
