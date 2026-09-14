import { qrModuleCount, qrSvg } from '@/lib/qr-code';
import { describe, expect, it } from 'vitest';

describe('qrModuleCount', () => {
    it('uses a version-1 matrix for a short string', () => {
        expect(qrModuleCount('hello', 'L')).toBe(21);
    });

    it('grows for longer content', () => {
        expect(qrModuleCount('x'.repeat(200), 'L')).toBeGreaterThan(21);
    });

    it('needs at least as many modules at a higher error correction level', () => {
        const content = 'The quick brown fox jumps over the lazy dog.';

        expect(qrModuleCount(content, 'H')).toBeGreaterThanOrEqual(qrModuleCount(content, 'L'));
    });

    it('throws for empty input', () => {
        expect(() => qrModuleCount('')).toThrow(/Enter something/);
    });

    it('throws when the content cannot fit', () => {
        expect(() => qrModuleCount('x'.repeat(5000), 'H')).toThrow(/too much data/);
    });
});

describe('qrSvg', () => {
    it('renders an svg with the requested colours', () => {
        const svg = qrSvg({ text: 'hello', errorCorrection: 'L', margin: 4, dark: '#112233', light: '#fefefe' });

        expect(svg).toContain('<svg');
        expect(svg).toContain('<path');
        expect(svg).toContain('fill="#112233"');
        expect(svg).toContain('fill="#fefefe"');
        expect(svg).toContain('viewBox="0 0 29 29"');
    });

    it('honours the quiet zone', () => {
        expect(qrSvg({ text: 'hello', errorCorrection: 'L', margin: 0 })).toContain('viewBox="0 0 21 21"');
    });
});
