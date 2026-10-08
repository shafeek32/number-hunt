/**
 * Scoring utilities — Phase 1 will call these after each game.
 * Phase 0: stubs only.
 */

import type { GameResult, Level } from '../types/game';

// Base score per number, scaled by difficulty multiplier
const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy:      1.0,
  normal:    1.2,
  hard:      1.5,
  'very-hard': 1.8,
  extreme:   2.2,
};

// Penalty per mistake
const MISTAKE_PENALTY = 500;

/** Calculate the final score for a completed game */
export function calculateScore(
  timeMs: number,
  mistakes: number,
  level: Level
): number {
  const multiplier = DIFFICULTY_MULTIPLIER[level.difficulty] ?? 1;
  const baseScore = Math.max(0, 100000 - timeMs / 10);
  const penalty = mistakes * MISTAKE_PENALTY;
  return Math.max(0, Math.round((baseScore - penalty) * multiplier));
}

/**
 * Calculate stars (1–3) based on player's run.
 * Normalized and fair across all levels:
 * - 3 Stars: 0 mistakes, or 1 mistake with high accuracy (>= 90%)
 * - 2 Stars: Low mistakes (<= 2) or good accuracy (>= 80%)
 * - 1 Star: Valid completion
 */
export function calculateStars(mistakes: number, accuracy: number): number {
  if (mistakes === 0 || (mistakes <= 1 && accuracy >= 90)) {
    return 3;
  }
  if (mistakes <= 2 || accuracy >= 80) {
    return 2;
  }
  return 1;
}

/** Check whether a result is a new personal best time */
export function isPersonalBest(
  result: GameResult,
  storedBestMs: number | null
): boolean {
  if (storedBestMs === null) return true;
  return result.timeMs < storedBestMs;
}

/** Format ms to display string, e.g. 7820 → "7.82s" */
export function formatTimeMs(ms: number): string {
  return (ms / 1000).toFixed(2) + 's';
}

/** Format score with commas, e.g. 9420 → "9,420" */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}
