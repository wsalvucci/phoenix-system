import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safeRedirect';

describe('safeNextPath', () => {
    it('keeps same-origin relative paths', () => {
        expect(safeNextPath('/student')).toBe('/student');
        expect(safeNextPath('/teacher/group/4?tab=scores#top')).toBe('/teacher/group/4?tab=scores#top');
    });

    it('falls back for absolute URLs', () => {
        expect(safeNextPath('https://evil.example/x')).toBe('/');
        expect(safeNextPath('javascript:alert(1)')).toBe('/');
    });

    it('falls back for protocol-relative and backslash forms', () => {
        expect(safeNextPath('//evil.example')).toBe('/');
        expect(safeNextPath('/\\evil.example')).toBe('/');
        expect(safeNextPath('/\\/evil.example')).toBe('/');
    });

    it('falls back for control characters', () => {
        expect(safeNextPath('/ok\n//evil.example')).toBe('/');
        expect(safeNextPath('/\t/evil.example')).toBe('/');
    });

    it('falls back for non-strings, empty and relative-without-slash values', () => {
        expect(safeNextPath(undefined)).toBe('/');
        expect(safeNextPath(['/a'])).toBe('/');
        expect(safeNextPath('')).toBe('/');
        expect(safeNextPath('student')).toBe('/');
    });

    it('uses a custom fallback', () => {
        expect(safeNextPath('//x', '/student')).toBe('/student');
    });
});
