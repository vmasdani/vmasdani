import { expandBox, faceBoxToRegion, faceModelUrl, faceResultFileName, faceWasmUrl } from '@/lib/face-blur';
import { describe, expect, it } from 'vitest';

describe('face urls', () => {
    it('prefix the origin', () => {
        expect(faceModelUrl('https://example.com')).toBe('https://example.com/face-blur/blaze_face_short_range.tflite');
        expect(faceWasmUrl('https://example.com')).toBe('https://example.com/face-blur/wasm');
    });
});

describe('faceBoxToRegion', () => {
    it('maps MediaPipe origin fields to x/y', () => {
        expect(faceBoxToRegion({ originX: 10, originY: 20, width: 30, height: 40 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    });
});

describe('expandBox', () => {
    it('grows the box symmetrically', () => {
        expect(expandBox({ x: 100, y: 100, width: 50, height: 50 }, 20)).toEqual({ x: 90, y: 90, width: 70, height: 70 });
    });

    it('never shrinks', () => {
        expect(expandBox({ x: 0, y: 0, width: 10, height: 10 }, -5)).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    });
});

describe('faceResultFileName', () => {
    it('suffixes the original name', () => {
        expect(faceResultFileName('group.jpg')).toBe('group-faces-blurred.png');
    });
});
