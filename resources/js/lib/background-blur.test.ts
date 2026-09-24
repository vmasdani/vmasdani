import { backgroundColorFileName, blurRadiusForStrength, clampBlurRadius } from '@/lib/background-blur';
import { describe, expect, it } from 'vitest';

describe('clampBlurRadius', () => {
    it('rounds and clamps to the allowed range', () => {
        expect(clampBlurRadius(12.6)).toBe(13);
        expect(clampBlurRadius(-5)).toBe(0);
        expect(clampBlurRadius(999)).toBe(60);
        expect(clampBlurRadius(Number.NaN)).toBe(0);
    });
});

describe('blurRadiusForStrength', () => {
    it('scales with the image size and clamps', () => {
        expect(blurRadiusForStrength(50, 1000)).toBe(50);
        expect(blurRadiusForStrength(100, 1000)).toBe(60);
        expect(blurRadiusForStrength(0, 1000)).toBe(0);
    });
});

describe('backgroundColorFileName', () => {
    it('names the output for each mode', () => {
        expect(backgroundColorFileName('portrait.jpg', 'blur')).toBe('portrait-blurred-background.png');
        expect(backgroundColorFileName('portrait.jpg', 'color')).toBe('portrait-recoloured-background.png');
    });
});
