/**
 * Randomizer utilities for Number Hunt.
 * Includes both non-deterministic Fisher-Yates and seeded deterministic shuffles.
 */

/** Fisher-Yates shuffle — returns a new shuffled array */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate a sequential array: [1, 2, ..., count] */
export function generateSequence(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Generate shuffled numbers for a normal game board */
export function generateBoard(count: number): number[] {
  return shuffle(generateSequence(count));
}

// ─── DETERMINISTIC SEEDED RANDOM GENERATION (DAILY CHALLENGE) ────────
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

function mulberry32(seedNum: number): () => number {
  let a = seedNum;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded deterministic shuffle — returns identical arrangement for the same seed */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate a deterministic board for daily challenges */
export function generateSeededBoard(count: number, seed: string): number[] {
  return seededShuffle(generateSequence(count), seed);
}
