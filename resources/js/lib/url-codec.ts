/**
 * URL percent-encoding.
 *
 * "component" encodes everything including reserved characters (for a query
 * value); "full" keeps URL structure (`:/?&=#`) intact while escaping spaces
 * and other unsafe characters.
 */

export type UrlEncodeMode = 'component' | 'full';

export function encodeUrl(input: string, mode: UrlEncodeMode = 'component'): string {
    return mode === 'full' ? encodeURI(input) : encodeURIComponent(input);
}

export function decodeUrl(input: string): string {
    try {
        return decodeURIComponent(input);
    } catch {
        throw new Error('This is not valid percent-encoding (look for a stray "%").');
    }
}
