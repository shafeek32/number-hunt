import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreateGuestId, guestTracker, getGuestRegistry } from '../src/utils/guestTracker';
import { LEVELS } from '../src/data/levels';

describe('Guest Tracking & Anonymous Identity (Section 1 & 2)', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const key in storageMock) {
      delete storageMock[key];
    }

    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storageMock[k] ?? null,
      setItem: (k: string, v: string) => { storageMock[k] = v; },
      removeItem: (k: string) => { delete storageMock[k]; },
      clear: () => {
        for (const k in storageMock) delete storageMock[k];
      },
      key: (i: number) => Object.keys(storageMock)[i] ?? null,
      get length() {
        return Object.keys(storageMock).length;
      },
    });
  });

  it('generates a stable anonymous guest ID that persists in localStorage', () => {
    const id1 = getOrCreateGuestId();
    expect(id1).toMatch(/^guest_[a-z0-9]{12}$/);

    // Call it again: must be the exact same ID (stable across page refreshes)
    const id2 = getOrCreateGuestId();
    expect(id2).toBe(id1);

    // Stored in localStorage
    expect(storageMock['nh_guest_device_id']).toBe(id1);
  });

  it('generates new ID if stored ID was a legacy mock ID', () => {
    storageMock['nh_guest_device_id'] = 'guest_4f89';
    const newId = getOrCreateGuestId();
    expect(newId).not.toBe('guest_4f89');
    expect(newId).toMatch(/^guest_[a-z0-9]{12}$/);
  });

  it('falls back safely to in-memory ID if localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError: Access Denied in Incognito'); },
      setItem: () => { throw new Error('QuotaExceeded'); },
    });

    const fallbackId1 = getOrCreateGuestId();
    expect(fallbackId1).toMatch(/^guest_[a-z0-9]+/);

    const fallbackId2 = getOrCreateGuestId();
    expect(fallbackId2).toBe(fallbackId1);
  });

  it('tracks completed guest gameplay offline and locally', () => {
    const level1 = LEVELS[0];
    const guestId = getOrCreateGuestId();

    guestTracker.trackGuestGame({
      levelId: level1.id,
      numberCount: level1.numberCount,
      timeMs: 8500,
      mistakes: 0,
      accuracy: 100,
      score: 95000,
      stars: 3,
    });

    const sessionsAfter = getGuestRegistry();
    const session = sessionsAfter.find((s) => s.id === guestId);
    expect(session).toBeDefined();
    expect(session!.totalGames).toBeGreaterThanOrEqual(1);
    expect(session!.bestScore).toBe(95000);
  });
});
