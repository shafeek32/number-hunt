-- Number Hunt Phase 3 Database Schema
-- Run this in the Supabase SQL Editor to set up tables, RLS policies, indexes, and triggers.

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 24),
  display_name TEXT NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 32),
  avatar TEXT DEFAULT '⚡' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. GAMES
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 16),
  number_count INTEGER NOT NULL CHECK (number_count >= 5 AND number_count <= 20),
  time_ms INTEGER NOT NULL CHECK (time_ms > 0),
  mistakes INTEGER NOT NULL DEFAULT 0 CHECK (mistakes >= 0),
  accuracy NUMERIC(5, 2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  score INTEGER NOT NULL CHECK (score >= 0),
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 3),
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. PLAYER STATS
CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0 NOT NULL,
  perfect_games INTEGER DEFAULT 0 NOT NULL,
  best_score INTEGER DEFAULT 0 NOT NULL,
  best_time_ms INTEGER DEFAULT NULL,
  highest_level INTEGER DEFAULT 1 NOT NULL,
  total_stars INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- 5. DAILY CHALLENGES
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL,
  level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 16),
  seed TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. DAILY CHALLENGE SCORES
CREATE TABLE IF NOT EXISTS public.daily_challenge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  time_ms INTEGER NOT NULL CHECK (time_ms > 0),
  mistakes INTEGER NOT NULL DEFAULT 0 CHECK (mistakes >= 0),
  accuracy NUMERIC(5, 2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  score INTEGER NOT NULL CHECK (score >= 0),
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (challenge_id, user_id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON public.games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_level_id ON public.games(level_id);
CREATE INDEX IF NOT EXISTS idx_games_score ON public.games(score DESC);
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON public.games(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_leaderboard ON public.games(level_id, score DESC, time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_scores_leaderboard ON public.daily_challenge_scores(challenge_id, score DESC, time_ms ASC);

-- ─── ROW LEVEL SECURITY & PERMISSIONS ──────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_scores ENABLE ROW LEVEL SECURITY;

-- Grant access to anon and authenticated roles so RLS policies can take effect
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- GAMES POLICIES
CREATE POLICY "Completed games are viewable by everyone for leaderboard"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own completed games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PLAYER STATS POLICIES
CREATE POLICY "Player stats are viewable by everyone"
  ON public.player_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.player_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.player_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- USER ACHIEVEMENTS POLICIES
CREATE POLICY "Achievements are viewable by everyone"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own unlocked achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DAILY CHALLENGES POLICIES
CREATE POLICY "Daily challenges are viewable by everyone"
  ON public.daily_challenges FOR SELECT
  USING (true);

-- DAILY CHALLENGE SCORES POLICIES
CREATE POLICY "Daily challenge scores are viewable by everyone"
  ON public.daily_challenge_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own daily score"
  ON public.daily_challenge_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── AUTOMATIC PROFILE CREATION TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'hunter_' || substring(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', 'Hunter'),
    COALESCE(new.raw_user_meta_data->>'avatar', '⚡')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.player_stats (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── SAMPLE DAILY CHALLENGE ──────────────────────────────────────────
INSERT INTO public.daily_challenges (challenge_date, level_id, seed)
VALUES (CURRENT_DATE, 8, 'number-hunt-' || CURRENT_DATE::text || '-8')
ON CONFLICT (challenge_date) DO NOTHING;
