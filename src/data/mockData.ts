import type {
  PlayerStats,
  LeaderboardEntry,
  DailyChallenge,
} from '../types/game';
import { LEVELS } from './levels';

// ─── MOCK PLAYER ──────────────────────────────────────────────────
export const MOCK_PLAYER: PlayerStats = {
  id: 'player-1',
  displayName: 'Shafeek',
  avatarInitials: 'SH',
  totalGames: 128,
  bestScore: 92420,
  bestTimeMs: 5210,
  perfectGames: 34,
  currentStreak: 7,
  currentLevel: 16,
  levelBests: [
    { levelId: 1,  timeMs: 6230,  score: 8200 },
    { levelId: 5,  timeMs: 7420,  score: 9100 },
    { levelId: 10, timeMs: 7820,  score: 9420 },
  ],
  achievements: [
    { id: 'first-hunt',     label: 'First Hunt',     description: 'Complete your first game.',          icon: '🏆', unlockedAt: '2025-01-10' },
    { id: 'speed-demon',    label: 'Speed Demon',    description: 'Finish a level in under 6 seconds.', icon: '⚡', unlockedAt: '2025-02-14' },
    { id: 'perfect',        label: 'Perfect',        description: 'Complete a level with 0 mistakes.',  icon: '🎯', unlockedAt: '2025-03-05' },
    { id: 'streak-7',       label: '7 Day Streak',   description: 'Play 7 days in a row.',              icon: '🔥', unlockedAt: '2025-05-20' },
    { id: 'memory-master',  label: 'Memory Master',  description: 'Complete Level 15 or above.',        icon: '🧠', unlockedAt: '2025-07-01' },
    { id: 'level-20',       label: 'Level 20',       description: 'Reach Level 16.',                    icon: '👑', unlockedAt: '2025-09-15' },
  ],
};

// ─── MOCK LEADERBOARD ─────────────────────────────────────────────
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,  playerId: 'p1', playerName: 'Alex',    avatarInitials: 'AX', score: 982420, timeMs: 4810, levelId: 10 },
  { rank: 2,  playerId: 'p2', playerName: 'Rahul',   avatarInitials: 'RA', score: 974820, timeMs: 4950, levelId: 10 },
  { rank: 3,  playerId: 'p3', playerName: 'Shafeek', avatarInitials: 'SH', score: 963210, timeMs: 5210, levelId: 10, isCurrentPlayer: true },
  { rank: 4,  playerId: 'p4', playerName: 'Arjun',   avatarInitials: 'AR', score: 950210, timeMs: 5380, levelId: 10 },
  { rank: 5,  playerId: 'p5', playerName: 'Maya',    avatarInitials: 'MA', score: 942880, timeMs: 5520, levelId: 10 },
  { rank: 6,  playerId: 'p6', playerName: 'Chen',    avatarInitials: 'CH', score: 931050, timeMs: 5640, levelId: 10 },
  { rank: 7,  playerId: 'p7', playerName: 'Priya',   avatarInitials: 'PR', score: 920100, timeMs: 5790, levelId: 10 },
  { rank: 8,  playerId: 'p8', playerName: 'Diego',   avatarInitials: 'DI', score: 914200, timeMs: 5920, levelId: 10 },
  { rank: 9,  playerId: 'p9', playerName: 'Yui',     avatarInitials: 'YU', score: 902340, timeMs: 6050, levelId: 10 },
  { rank: 10, playerId: 'p10',playerName: 'Sam',     avatarInitials: 'SA', score: 891560, timeMs: 6210, levelId: 10 },
];

// ─── MOCK DAILY CHALLENGE ─────────────────────────────────────────
export const MOCK_DAILY_CHALLENGE: DailyChallenge = {
  date: new Date().toISOString().slice(0, 10),
  level: LEVELS[15], // Level 16 — 20 numbers
  participantCount: 3847,
  worldBestMs: 8120,
  playerBestMs: 12830,
  playerScore: 74200,
};
