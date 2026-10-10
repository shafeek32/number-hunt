import { describe, it, expect } from 'vitest';
import { calculateScore, calculateStars, formatTimeMs, formatScore } from '../src/utils/scoring';
import { LEVELS, getLevelById } from '../src/data/levels';

describe('Canonical Scoring System (Section 5)', () => {
  it('correctly maps difficulty multipliers across all 16 levels', () => {
    // Multipliers:
    // Levels 1–3: 1.0x
    // Levels 4–7: 1.2x
    // Levels 8–11: 1.5x
    // Levels 12–14: 1.8x
    // Levels 15–16: 2.2x
    for (let l = 1; l <= 3; l++) {
      const level = getLevelById(l)!;
      expect(level.difficulty).toBe('easy');
    }
    for (let l = 4; l <= 7; l++) {
      const level = getLevelById(l)!;
      expect(level.difficulty).toBe('normal');
    }
    for (let l = 8; l <= 11; l++) {
      const level = getLevelById(l)!;
      expect(level.difficulty).toBe('hard');
    }
    for (let l = 12; l <= 14; l++) {
      const level = getLevelById(l)!;
      expect(level.difficulty).toBe('very-hard');
    }
    for (let l = 15; l <= 16; l++) {
      const level = getLevelById(l)!;
      expect(level.difficulty).toBe('extreme');
    }
  });

  it('calculates score accurately for perfect runs', () => {
    // Formula:
    // Base Score = max(0, 100000 - time_ms / 10)
    // Penalty = mistakes * 500
    // Final Score = max(0, round((Base Score - Penalty) * Multiplier))
    const level1 = getLevelById(1)!; // Multiplier 1.0
    const timeMs = 10000; // 10s -> base score = 100000 - 1000 = 99000
    const mistakes = 0;
    const score = calculateScore(timeMs, mistakes, level1);
    expect(score).toBe(99000);

    const level4 = getLevelById(4)!; // Multiplier 1.2
    // base score = 99000 * 1.2 = 118800
    const scoreL4 = calculateScore(timeMs, mistakes, level4);
    expect(scoreL4).toBe(118800);

    const level8 = getLevelById(8)!; // Multiplier 1.5
    // base score = 99000 * 1.5 = 148500
    const scoreL8 = calculateScore(timeMs, mistakes, level8);
    expect(scoreL8).toBe(148500);

    const level12 = getLevelById(12)!; // Multiplier 1.8
    // base score = 99000 * 1.8 = 178200
    const scoreL12 = calculateScore(timeMs, mistakes, level12);
    expect(scoreL12).toBe(178200);

    const level16 = getLevelById(16)!; // Multiplier 2.2
    // base score = 99000 * 2.2 = 217800
    const scoreL16 = calculateScore(timeMs, mistakes, level16);
    expect(scoreL16).toBe(217800);
  });

  it('applies penalty of 500 per mistake before multiplying', () => {
    const level5 = getLevelById(5)!; // Normal (1.2x)
    const timeMs = 20000; // base score = 100000 - 2000 = 98000
    const mistakes = 4; // penalty = 2000
    // net = 96000 * 1.2 = 115200
    const score = calculateScore(timeMs, mistakes, level5);
    expect(score).toBe(115200);
  });

  it('never produces negative scores', () => {
    const level1 = getLevelById(1)!;
    const timeMs = 2000000; // very slow time
    const mistakes = 500;
    const score = calculateScore(timeMs, mistakes, level1);
    expect(score).toBe(0);
  });

  it('computes stars properly according to accuracy and mistakes', () => {
    expect(calculateStars(0, 100)).toBe(3);
    expect(calculateStars(1, 95)).toBe(3);
    expect(calculateStars(2, 85)).toBe(2);
    expect(calculateStars(5, 50)).toBe(1);
  });

  it('formats time and scores cleanly', () => {
    expect(formatTimeMs(7820)).toBe('7.82s');
    expect(formatScore(115200)).toBe('115,200');
  });
});
