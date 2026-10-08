import type { Level, Difficulty } from '../types/game';

// Grid size helper: pick grid dimensions that fit the number count
function gridFor(count: number): { rows: number; cols: number } {
  const sizes: Record<number, { rows: number; cols: number }> = {
    5:  { rows: 2, cols: 3 },
    6:  { rows: 2, cols: 3 },
    7:  { rows: 2, cols: 4 },
    8:  { rows: 2, cols: 4 },
    9:  { rows: 3, cols: 3 },
    10: { rows: 3, cols: 4 },
    11: { rows: 3, cols: 4 },
    12: { rows: 3, cols: 4 },
    13: { rows: 4, cols: 4 },
    14: { rows: 4, cols: 4 },
    15: { rows: 4, cols: 4 },
    16: { rows: 4, cols: 4 },
    17: { rows: 4, cols: 5 },
    18: { rows: 4, cols: 5 },
    19: { rows: 4, cols: 5 },
    20: { rows: 4, cols: 5 },
  };
  return sizes[count] ?? { rows: 4, cols: 5 };
}

function difficultyFor(levelId: number): Difficulty {
  if (levelId <= 4)  return 'easy';
  if (levelId <= 8)  return 'normal';
  if (levelId <= 11) return 'hard';
  if (levelId <= 14) return 'very-hard';
  return 'extreme';
}

function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'easy':      return 'EASY';
    case 'normal':    return 'NORMAL';
    case 'hard':      return 'HARD';
    case 'very-hard': return 'VERY HARD';
    case 'extreme':   return 'EXTREME';
  }
}

// Build all 16 levels
export const LEVELS: Level[] = Array.from({ length: 16 }, (_, i) => {
  const id = i + 1;
  const numberCount = id + 4; // Level 1 → 5, Level 16 → 20
  const difficulty = difficultyFor(id);
  return {
    id,
    numberCount,
    difficulty,
    label: `LEVEL ${id}`,
    gridSize: gridFor(numberCount),
  };
});

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getDifficultyLabel(d: Difficulty): string {
  return difficultyLabel(d);
}

// Mock personal bests per level (for UI placeholders)
export const MOCK_LEVEL_BESTS: Record<number, number | null> = {
  1: 6230,   // ms
  2: null,
  3: null,
  4: null,
  5: 7420,
  6: null,
  7: null,
  8: null,
  9: null,
  10: 7820,
  11: null,
  12: null,
  13: null,
  14: null,
  15: null,
  16: null,
};

export function formatTime(ms: number): string {
  return (ms / 1000).toFixed(2) + 's';
}
