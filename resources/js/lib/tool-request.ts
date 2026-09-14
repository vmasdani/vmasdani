/**
 * Fetch a JSON result from one of the tool run endpoints.
 *
 * Throttled (429) and error responses do not match the tool payload shape, so
 * the parsed body is verified with a type guard before it is handed back. When
 * the shape does not match, a human-readable failure message is returned
 * instead and the caller keeps its result state untouched.
 */
export async function fetchToolJson<T>(
    url: string,
    isValidResult: (data: unknown) => data is T,
): Promise<{ data: T; failure: null } | { data: null; failure: string }> {
    try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        const data: unknown = await response.json().catch(() => null);

        if (isValidResult(data)) {
            return { data, failure: null };
        }

        const message = typeof (data as { message?: unknown })?.message === 'string' ? (data as { message: string }).message : null;

        return {
            data: null,
            failure:
                message ??
                (response.status === 429 ? 'Too many requests. Please wait a minute and try again.' : 'The server returned an unexpected response.'),
        };
    } catch {
        return { data: null, failure: 'Could not reach the server. Please try again.' };
    }
}
