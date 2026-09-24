/**
 * License-plate detection helpers. The detector is a YOLOS (DETR-style) ONNX
 * model run via onnxruntime-web, so it reuses the WASM runtime already vendored
 * for the background remover. Pre/post-processing is pure and unit-tested; only
 * `prepareModelInput` touches the canvas.
 */

export const PLATE_MODEL_PATH = '/license-plate/model_quantized.onnx';

/** Self-hosted onnxruntime-web WASM, so this tool does not depend on the
 * background-removal bundle being present. */
export const PLATE_ORT_PATH = '/license-plate/ort';

/** YOLOS was trained at 864x512 (WxH). */
export const PLATE_INPUT_WIDTH = 864;
export const PLATE_INPUT_HEIGHT = 512;

/** Normalisation from preprocessor_config.json. */
export const PLATE_IMAGE_MEAN = [0.485, 0.456, 0.406] as const;
export const PLATE_IMAGE_STD = [0.229, 0.224, 0.225] as const;

/** Label index for "license-plates" in the model's id2label map. */
export const PLATE_CLASS_INDEX = 1;

export const DEFAULT_BOX_THRESHOLD = 0.5;
export const DEFAULT_IOU_THRESHOLD = 0.5;

export interface PlateDetection {
    /** Top-left, in pixels of the original image. */
    x: number;
    y: number;
    width: number;
    height: number;
    score: number;
}

export function plateModelUrl(origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${PLATE_MODEL_PATH}`;
}

export function plateOrtUrl(origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

    return `${base}${PLATE_ORT_PATH}/`;
}

/**
 * Convert RGBA canvas pixels to a normalised NCHW Float32 tensor, the layout
 * YOLOS expects. Pure so it can be tested with a hand-made pixel array.
 */
export function normalizePixels(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Float32Array {
    const pixels = width * height;
    const output = new Float32Array(3 * pixels);

    for (let index = 0; index < pixels; index++) {
        for (let channel = 0; channel < 3; channel++) {
            const value = rgba[index * 4 + channel] / 255;

            output[channel * pixels + index] = (value - PLATE_IMAGE_MEAN[channel]) / PLATE_IMAGE_STD[channel];
        }
    }

    return output;
}

/** Numerically stable softmax over a slice of scores. */
export function softmax(scores: ArrayLike<number>): number[] {
    let max = -Infinity;

    for (let index = 0; index < scores.length; index++) {
        if (scores[index] > max) {
            max = scores[index];
        }
    }

    const exps = Array.from(scores, (score) => Math.exp(score - max));
    const total = exps.reduce((sum, value) => sum + value, 0);

    return exps.map((value) => value / total);
}

/**
 * Decode YOLOS outputs into pixel-space boxes. `logits` is [numQueries x
 * numClasses] and `boxes` is [numQueries x 4] as normalised cxcywh (the DETR
 * convention). Boxes below the score threshold are dropped.
 */
export function decodeDetections(
    logits: ArrayLike<number>,
    boxes: ArrayLike<number>,
    options: {
        numClasses: number;
        threshold?: number;
        imageWidth: number;
        imageHeight: number;
    },
): PlateDetection[] {
    const { numClasses, threshold = DEFAULT_BOX_THRESHOLD, imageWidth, imageHeight } = options;
    const queries = Math.floor(boxes.length / 4);
    const detections: PlateDetection[] = [];

    for (let query = 0; query < queries; query++) {
        const scores = softmax(Array.from({ length: numClasses }, (_, label) => logits[query * numClasses + label]));

        let bestLabel = 0;

        for (let label = 1; label < numClasses; label++) {
            if (scores[label] > scores[bestLabel]) {
                bestLabel = label;
            }
        }

        if (bestLabel !== PLATE_CLASS_INDEX || scores[bestLabel] < threshold) {
            continue;
        }

        const centerX = boxes[query * 4];
        const centerY = boxes[query * 4 + 1];
        const boxWidth = boxes[query * 4 + 2];
        const boxHeight = boxes[query * 4 + 3];
        const x = (centerX - boxWidth / 2) * imageWidth;
        const y = (centerY - boxHeight / 2) * imageHeight;

        detections.push({
            x,
            y,
            width: boxWidth * imageWidth,
            height: boxHeight * imageHeight,
            score: scores[bestLabel],
        });
    }

    return detections;
}

/** Intersection over union of two boxes. */
export function boxIou(a: PlateDetection, b: PlateDetection): number {
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);

    if (intersection === 0) {
        return 0;
    }

    const union = a.width * a.height + b.width * b.height - intersection;

    return intersection / union;
}

/** Greedy non-maximum suppression, highest score first. */
export function nonMaxSuppression(detections: PlateDetection[], iouThreshold = DEFAULT_IOU_THRESHOLD): PlateDetection[] {
    const sorted = [...detections].sort((a, b) => b.score - a.score);
    const kept: PlateDetection[] = [];

    for (const candidate of sorted) {
        if (kept.every((existing) => boxIou(existing, candidate) < iouThreshold)) {
            kept.push(candidate);
        }
    }

    return kept;
}

/** Clamp a detection to the image bounds so canvas blur stays in range. */
export function clampBoxToImage(box: PlateDetection, imageWidth: number, imageHeight: number): PlateDetection {
    const x = Math.max(0, Math.min(box.x, imageWidth));
    const y = Math.max(0, Math.min(box.y, imageHeight));
    const right = Math.max(0, Math.min(box.x + box.width, imageWidth));
    const bottom = Math.max(0, Math.min(box.y + box.height, imageHeight));

    return { x, y, width: right - x, height: bottom - y, score: box.score };
}

/**
 * Draw an image onto the fixed model input size and return the normalised
 * tensor. Browser-only. The image is stretched to the model's 864x512 input;
 * detections come back normalised so they scale to the original size.
 */
export function prepareModelInput(image: HTMLImageElement): { data: Float32Array; width: number; height: number } {
    const canvas = document.createElement('canvas');

    canvas.width = PLATE_INPUT_WIDTH;
    canvas.height = PLATE_INPUT_HEIGHT;

    const context = canvas.getContext('2d');

    if (context === null) {
        throw new Error('Canvas is unavailable in this browser.');
    }

    context.drawImage(image, 0, 0, PLATE_INPUT_WIDTH, PLATE_INPUT_HEIGHT);

    const { data } = context.getImageData(0, 0, PLATE_INPUT_WIDTH, PLATE_INPUT_HEIGHT);

    return { data: normalizePixels(data, PLATE_INPUT_WIDTH, PLATE_INPUT_HEIGHT), width: PLATE_INPUT_WIDTH, height: PLATE_INPUT_HEIGHT };
}
