import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the client-only tool logic in resources/js/lib.
 * The libs are pure and framework-free, so a plain Node environment is enough
 * (Node 18+ provides crypto.subtle and crypto.getRandomValues).
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
        globals: false,
    },
});
