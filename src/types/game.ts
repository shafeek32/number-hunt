// ─── DIFFICULTY ────────────────────────────────────────────────────
export type Difficulty = 'easy' | 'normal' | 'hard' | 'very-hard' | 'extreme';

// ─── LEVEL ─────────────────────────────────────────────────────────
export interface Level {
  id: number;
  numberCount: number;
  difficulty: Difficulty;
  label: string; // e.g. "LEVEL 1"
  gridSize: GridSize;
}

export interface GridSize {
  rows: number;
  cols: number;
}

// ─── GAME STATE ────────────────────────────────────────────────────
export type GamePhase = 'idle' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface GameState {
  phase: GamePhase;
  level: Level;
  numbers: number[];        // All numbers on the board (shuffled)
  targetNumber: number;     // The number the player should click next
  foundNumbers: number[];   // Numbers successfully found so far
  mistakes: number;
  startTime: number | null; // Unix ms timestamp
  elapsedMs: number;
}

// ─── GAME RESULT ───────────────────────────────────────────────────
export interface GameResult {
  level: Level;
  timeMs: number;           // Total time in milliseconds
  mistakes: number;
  accuracy: number;         // 0–100 %
  score: number;
  stars: number;            // 1, 2, or 3 stars
  isPersonalBest: boolean;
  isNewRecord: boolean;
  newlyUnlockedAchievements?: string[];
}

// ─── STREAK DATA ──────────────────────────────────────────────────
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // ISO YYYY-MM-DD
}

// ─── PLAYER STATS ─────────────────────────────────────────────────
export interface LevelBest {
  levelId: number;
  timeMs: number;
  score: number;
  mistakes?: number;
  accuracy?: number;
  stars?: number;
  achievedAt?: number;
}

export interface PlayerStats {
  id: string;
  displayName: string;
  avatarInitials: string;
  totalGames: number;
  bestScore: number;
  bestTimeMs: number;
  perfectGames: number;     // 0-mistake games
  currentStreak: number;    // Days in a row
  longestStreak?: number;
  currentLevel: number;     // Highest unlocked level
  levelBests: LevelBest[];
  achievements: Achievement[];
}

// ─── LEADERBOARD ──────────────────────────────────────────────────
export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all-time';
export type LeaderboardFilter = 'all' | `level-${number}`;

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatarInitials: string;
  score: number;
  timeMs: number;
  levelId: number;
  isCurrentPlayer?: boolean;
}

// ─── ACHIEVEMENT ──────────────────────────────────────────────────
export type AchievementId =
  | 'first-hunt'
  | 'perfect-hunt'
  | 'speed-hunter'
  | 'level-5'
  | 'level-10'
  | 'level-16'
  | 'star-collector'
  | 'three-star-hunter'
  | 'no-mistake-streak'
  | 'hunter'
  | string;

export interface Achievement {
  id: AchievementId;
  title?: string;
  label?: string;          // Alias for title for backward compatibility
  description: string;
  icon: string;           // Emoji
  unlockedAt: string | null; // ISO date string, null if locked
}

// ─── DAILY CHALLENGE ──────────────────────────────────────────────
export interface DailyChallenge {
  date: string;           // ISO date string YYYY-MM-DD
  level: Level;
  participantCount: number;
  worldBestMs: number;
  playerBestMs: number | null;
  playerScore: number | null;
}

// ─── BUTTON VARIANT ───────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
