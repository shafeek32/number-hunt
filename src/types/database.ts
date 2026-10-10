export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface GameRow {
  id: string;
  user_id: string | null;
  guest_id?: string | null;
  level_id: number;
  number_count: number;
  time_ms: number;
  mistakes: number;
  accuracy: number;
  score: number;
  stars: number;
  game_mode?: string;
  status?: string;
  is_flagged?: boolean;
  flag_reason?: string | null;
  is_verified?: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  client_token?: string | null;
  completed_at: string;
  created_at: string;
  profiles?: Pick<ProfileRow, 'username' | 'display_name' | 'avatar'> | null;
}

export interface PlayerStatsRow {
  user_id: string;
  total_games: number;
  perfect_games: number;
  best_score: number;
  best_time_ms: number | null;
  highest_level: number;
  total_stars: number;
  current_streak: number;
  longest_streak: number;
  updated_at: string;
}

export interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface DailyChallengeRow {
  id: string;
  challenge_date: string;
  level_id: number;
  seed: string;
  created_at: string;
}

export interface DailyChallengeScoreRow {
  id: string;
  challenge_id: string;
  user_id: string;
  time_ms: number;
  mistakes: number;
  accuracy: number;
  score: number;
  completed_at: string;
  profiles?: Pick<ProfileRow, 'username' | 'display_name' | 'avatar'>;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; username: string; display_name: string };
        Update: Partial<ProfileRow>;
      };
      games: {
        Row: GameRow;
        Insert: Omit<GameRow, 'id' | 'created_at' | 'profiles'>;
        Update: Partial<GameRow>;
      };
      player_stats: {
        Row: PlayerStatsRow;
        Insert: Partial<PlayerStatsRow> & { user_id: string };
        Update: Partial<PlayerStatsRow>;
      };
      user_achievements: {
        Row: UserAchievementRow;
        Insert: UserAchievementRow;
        Update: Partial<UserAchievementRow>;
      };
      daily_challenges: {
        Row: DailyChallengeRow;
        Insert: Omit<DailyChallengeRow, 'id' | 'created_at'>;
        Update: Partial<DailyChallengeRow>;
      };
      daily_challenge_scores: {
        Row: DailyChallengeScoreRow;
        Insert: Omit<DailyChallengeScoreRow, 'id' | 'profiles'>;
        Update: Partial<DailyChallengeScoreRow>;
      };
    };
  };
}
