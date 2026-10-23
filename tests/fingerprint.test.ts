import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBrowserFingerprint, clearBrowserFingerprint } from '@/lib/fingerprint';

describe('Browser Fingerprint Utility', () => {
  const originalWindow = global.window;
  const originalLocalStorage = global.localStorage;

  let storageMock: Record<string, string>;

  beforeEach(() => {
    storageMock = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => storageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storageMock[key];
      }),
      clear: vi.fn(() => {
        storageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    };

    (globalThis as any).window = {} as any;
    (globalThis as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalLocalStorage;
  });

  it('throws an error if window or localStorage is undefined (non-browser env)', () => {
    delete (globalThis as any).window;
    expect(() => getBrowserFingerprint()).toThrow(
      'getBrowserFingerprint can only be called in browser environment'
    );
  });

  it('generates a new UUID fingerprint and stores it in localStorage', () => {
    const fingerprint = getBrowserFingerprint();

    expect(typeof fingerprint).toBe('string');
    expect(fingerprint).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(global.localStorage.setItem).toHaveBeenCalledWith('voting_fingerprint', fingerprint);
    expect(global.localStorage.getItem('voting_fingerprint')).toBe(fingerprint);
  });

  it('reuses the existing fingerprint if already in localStorage', () => {
    const existing = 'custom-existing-fingerprint-uuid';
    storageMock['voting_fingerprint'] = existing;

    const result = getBrowserFingerprint();

    expect(result).toBe(existing);
    expect(global.localStorage.setItem).not.toHaveBeenCalled();
  });

  it('clears the fingerprint using clearBrowserFingerprint', () => {
    storageMock['voting_fingerprint'] = 'saved-fingerprint';

    clearBrowserFingerprint();

    expect(global.localStorage.removeItem).toHaveBeenCalledWith('voting_fingerprint');
    expect(storageMock['voting_fingerprint']).toBeUndefined();
  });

  it('uses fallback generator if crypto.randomUUID is not present', () => {
    vi.stubGlobal('crypto', undefined);

    const fallbackFingerprint = getBrowserFingerprint();

    expect(typeof fallbackFingerprint).toBe('string');
    expect(fallbackFingerprint).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    vi.unstubAllGlobals();
  });
});
