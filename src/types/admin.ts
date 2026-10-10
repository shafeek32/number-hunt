/**
 * Admin Dashboard & Analytics Types
 */

import type { ProfileRow, PlayerStatsRow } from './database';

export type DateRangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'all' | 'custom';

export interface DateRangeFilter {
  key: DateRangeKey;
  startDate?: string;
  endDate?: string;
}

export interface AdminTopPlayer {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  levelId: number;
  score: number;
  timeMs: number;
  mistakes: number;
  completedAt: string;
}

export interface AdminLevelActivity {
  levelId: number;
  numberCount: number;
  difficulty: string;
  plays: number;
  completed: number;
  completionRate: number; // percentage (0 - 100)
  avgTimeMs: number;
  avgScore: number;
  dropoffPct: number; // drop-off percentage from previous level
}

export interface ActivityTimePoint {
  timeLabel: string;
  activePlayers: number;
  timestamp?: string;
}

export interface GamesTimePoint {
  timeLabel: string;
  started: number;
  completed: number;
  timestamp?: string;
}

export interface DashboardMetrics {
  totalUsers: number; // total registered users
  registeredUsersCount: number;
  guestPlayersCount: number; // count of unique guest players from Supabase
  totalPlayers: number; // registered + unique guests
  guestGamesPlayed: number; // total games played by guests
  totalGamesCompleted: number; // all-time completed games
  activeGuestsToday: number; // guest players active today
  newUsersToday: number;
  activePlayersToday: number;
  gamesStartedToday: number;
  gamesCompletedToday: number;
  gamesCompletedThisWeek: number;
  totalValidScores: number; // unflagged scores
  registeredGamesCount: number; // games played by registered users in period
  guestGamesCount: number; // games played by guests in period
  completionRate: number; // percentage
  averageScore: number;
  averageTimeMs: number;
  perfectGames: number;
  totalPlayTimeMs: number;
  activitySeries: ActivityTimePoint[];
  gamesSeries: GamesTimePoint[];
  topPlayers: AdminTopPlayer[];
  levelActivity: AdminLevelActivity[];
  recentGames?: AdminGameItem[];
}

export interface AdminUserItem {
  id: string;
  avatar: string;
  username: string;
  displayName: string;
  email: string | null;
  isGuest?: boolean;
  totalGames: number;
  completedGames: number;
  bestScore: number;
  highestLevel: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  joinedAt: string;
  lastPlayedAt: string | null;
  isAdmin: boolean;
  adminRole?: string;
  isBanned: boolean;
  banReason?: string;
}

export interface AdminUserDetail {
  profile: ProfileRow & { email?: string };
  stats: PlayerStatsRow;
  isAdmin: boolean;
  adminRole?: string;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  banExpiresAt?: string | null;
  totalPlayTimeMs: number;
  averageScore: number;
  averageTimeMs: number;
  completionRate: number;
  levelPerformance: {
    levelId: number;
    bestScore: number;
    bestTimeMs: number | null;
    bestStars: number;
    gamesPlayed: number;
    completed: number;
  }[];
  recentGames: AdminGameItem[];
}

export interface AdminGameItem {
  id: string;
  userId: string | null;
  guestId?: string | null;
  isGuest?: boolean;
  gameMode?: string;
  status?: string;
  username: string;
  displayName: string;
  avatar: string;
  levelId: number;
  numberCount: number;
  isDaily: boolean;
  challengeDate?: string;
  score: number;
  timeMs: number;
  mistakes: number;
  accuracy: number;
  stars: number;
  completedAt: string;
  createdAt: string;
  isFlagged: boolean;
  flagReason: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
  isBannedPlayer?: boolean;
}

export interface AdminAchievementStat {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlockedCount: number;
  unlockRate: number; // percentage of total users
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
}

export interface AdminRoleItem {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: 'moderator' | 'admin' | 'superadmin';
  grantedAt: string;
}

export interface LevelTimeLimitItem {
  levelId: number;
  numberCount: number;
  minTimeMs: number;
  parTimeMs: number;
}
