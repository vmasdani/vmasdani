import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copy text to the clipboard with a short "copied" confirmation window.
 * Falls back to a hidden textarea for browsers/contexts without the async
 * clipboard API (e.g. non-secure origins).
 */
export function useClipboard(resetAfter = 1500) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timer.current !== null) {
                window.clearTimeout(timer.current);
            }
        },
        [],
    );

    const copy = useCallback(
        async (text: string): Promise<boolean> => {
            if (text === '') {
                return false;
            }

            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    fallbackCopy(text);
                }

                setCopied(true);

                if (timer.current !== null) {
                    window.clearTimeout(timer.current);
                }

                timer.current = window.setTimeout(() => setCopied(false), resetAfter);

                return true;
            } catch {
                return false;
            }
        },
        [resetAfter],
    );

    return { copied, copy };
}

function fallbackCopy(text: string): void {
    const element = document.createElement('textarea');

    element.value = text;
    element.setAttribute('readonly', '');
    element.style.position = 'fixed';
    element.style.opacity = '0';

    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);
}
