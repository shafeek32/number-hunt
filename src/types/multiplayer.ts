import type { Level } from './game';

export interface DuelPlayer {
  id: 'p1' | 'p2';
  name: string;
  color: 'amber' | 'cyan';
  mistakes: number;
  bestStreak: number;
  currentStreak: number;
  turnsTaken: number;
}

export type DuelPhase = 'setup' | 'countdown' | 'playing' | 'turn_transition' | 'finished';

export interface DuelGameState {
  phase: DuelPhase;
  level: Level;
  numbers: number[];
  targetNumber: number;
  foundNumbers: number[];
  activePlayerId: 'p1' | 'p2';
  players: {
    p1: DuelPlayer;
    p2: DuelPlayer;
  };
  winnerId: 'p1' | 'p2' | null;
  wrongNumber: number | null;
  turnNumber: number;
}
