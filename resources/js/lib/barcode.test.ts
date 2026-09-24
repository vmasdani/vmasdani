import { classifyContent, contentHref, scannerWasmUrl } from '@/lib/barcode';
import { describe, expect, it } from 'vitest';

describe('scannerWasmUrl', () => {
    it('makes the path absolute', () => {
        expect(scannerWasmUrl('https://vmasdani.my.id')).toBe('https://vmasdani.my.id/barcode-scanner/zxing_reader.wasm');
    });
});

describe('classifyContent', () => {
    it('recognises urls, wifi, email, phone and geo payloads', () => {
        expect(classifyContent('https://example.com')).toBe('url');
        expect(classifyContent('WIFI:T:WPA;S:net;P:pw;;')).toBe('wifi');
        expect(classifyContent('me@example.com')).toBe('email');
        expect(classifyContent('+62 812-3456-7890')).toBe('phone');
        expect(classifyContent('geo:-6.2,106.8')).toBe('geo');
        expect(classifyContent('plain note')).toBe('text');
    });
});

describe('contentHref', () => {
    it('builds mailto and tel links', () => {
        expect(contentHref('me@example.com')).toBe('mailto:me@example.com');
        expect(contentHref('+62 812 3456')).toBe('tel:+628123456');
        expect(contentHref('https://example.com')).toBe('https://example.com');
        expect(contentHref('just text')).toBeNull();
    });
});
