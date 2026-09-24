import { boxIou, clampBoxToImage, decodeDetections, nonMaxSuppression, normalizePixels, softmax, type PlateDetection } from '@/lib/license-plate';
import { describe, expect, it } from 'vitest';

describe('normalizePixels', () => {
    it('produces a normalised NCHW tensor', () => {
        const output = normalizePixels(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);

        expect(Array.from(output)).toHaveLength(3);
        expect(output[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
        expect(output[1]).toBeCloseTo((1 - 0.456) / 0.224, 5);
        expect(output[2]).toBeCloseTo((1 - 0.406) / 0.225, 5);
    });

    it('keeps channels planar for a 2-pixel image', () => {
        const output = normalizePixels(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 255]), 2, 1);

        expect(output).toHaveLength(6);
        expect(output[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
        expect(output[2]).toBeCloseTo((0 - 0.456) / 0.224, 5);
        expect(output[4]).toBeCloseTo((0 - 0.406) / 0.225, 5);
    });
});

describe('softmax', () => {
    it('normalises scores to a probability distribution', () => {
        const result = softmax([1, 1]);

        expect(result[0]).toBeCloseTo(0.5, 6);
        expect(result.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6);
    });
});

describe('decodeDetections', () => {
    it('keeps the plate class above threshold and maps to pixels', () => {
        const logits = [0, 5, 5, 0];
        const boxes = [0.5, 0.5, 0.2, 0.1, 0.5, 0.5, 0.2, 0.1];
        const detections = decodeDetections(logits, boxes, { numClasses: 2, imageWidth: 1000, imageHeight: 500 });

        expect(detections).toHaveLength(1);
        expect(detections[0].x).toBeCloseTo(400, 5);
        expect(detections[0].y).toBeCloseTo(225, 5);
        expect(detections[0].width).toBeCloseTo(200, 5);
        expect(detections[0].height).toBeCloseTo(50, 5);
    });

    it('drops detections below the threshold', () => {
        const logits = [0, 0.1, 0, 0.1];

        expect(
            decodeDetections(logits, [0.5, 0.5, 0.2, 0.1, 0.5, 0.5, 0.2, 0.1], { numClasses: 2, threshold: 0.9, imageWidth: 100, imageHeight: 100 }),
        ).toHaveLength(0);
    });
});

describe('boxIou', () => {
    const box = (x: number, y: number, width: number, height: number): PlateDetection => ({ x, y, width, height, score: 1 });

    it('is 1 for identical boxes and 0 for disjoint boxes', () => {
        expect(boxIou(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1);
        expect(boxIou(box(0, 0, 10, 10), box(20, 20, 10, 10))).toBe(0);
    });
});

describe('nonMaxSuppression', () => {
    it('keeps the highest-scoring of overlapping boxes', () => {
        const detections: PlateDetection[] = [
            { x: 0, y: 0, width: 10, height: 10, score: 0.9 },
            { x: 1, y: 1, width: 10, height: 10, score: 0.7 },
            { x: 50, y: 50, width: 10, height: 10, score: 0.8 },
        ];

        expect(nonMaxSuppression(detections)).toHaveLength(2);
    });
});

describe('clampBoxToImage', () => {
    it('trims a box that runs past the image edge', () => {
        const clamped = clampBoxToImage({ x: 90, y: 90, width: 40, height: 40, score: 1 }, 100, 100);

        expect(clamped).toMatchObject({ x: 90, y: 90, width: 10, height: 10 });
    });
});
