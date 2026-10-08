/**
 * Game engine utilities — Phase 1 will flesh these out.
 * Phase 0: stubs only.
 */

import type { Level, GameState } from '../types/game';

import { generateBoard } from './randomizer';

/** Create an initial (idle) game state for a given level with generated board */
export function createInitialGameState(level: Level): GameState {
  return {
    phase: 'idle',
    level,
    numbers: generateBoard(level.numberCount),
    targetNumber: 1,
    foundNumbers: [],
    mistakes: 0,
    startTime: null,
    elapsedMs: 0,
  };
}

/** Check whether a clicked number is the correct target */
export function isCorrectTarget(
  clickedNumber: number,
  gameState: GameState
): boolean {
  return clickedNumber === gameState.targetNumber;
}

/** Calculate accuracy percentage */
export function calcAccuracy(found: number, mistakes: number): number {
  const attempts = found + mistakes;
  if (attempts === 0) return 100;
  return Math.round((found / attempts) * 1000) / 10;
}
