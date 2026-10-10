-- ==============================================================================
-- Number Hunt Migration: Guest Gameplay Persistence & Security
-- Run this in the Supabase SQL Editor.
-- Enables saving and analyzing guest gameplay without user registration.
-- ==============================================================================

-- 1. Allow user_id to be NULL in games table for guest sessions
ALTER TABLE public.games ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest_id column to track anonymous player identifiers
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- 3. Add game_mode and status columns (compatible with existing code)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'standard';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- 4. Constraint: Game must have either user_id or guest_id
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS chk_games_user_or_guest;
ALTER TABLE public.games ADD CONSTRAINT chk_games_user_or_guest
  CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL);

-- 5. Indexes for fast aggregation and analytics
CREATE INDEX IF NOT EXISTS idx_games_guest_id ON public.games(guest_id);
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON public.games(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_game_mode ON public.games(game_mode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_client_token_unique
  ON public.games(client_token)
  WHERE client_token IS NOT NULL;

-- 6. Row Level Security: Allow anonymous and authenticated guests to insert completed games
-- Restrict fields: Must NOT set user_id, must provide valid guest_id, cannot self-verify or self-flag
DROP POLICY IF EXISTS "Allow guest game submissions" ON public.games;
CREATE POLICY "Allow guest game submissions"
  ON public.games FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL
    AND guest_id IS NOT NULL
    AND length(guest_id) >= 6
    AND length(guest_id) <= 64
    AND is_flagged = false
    AND is_verified = false
    AND verified_by IS NULL
    AND verified_at IS NULL
    AND time_ms > 0
    AND score >= 0
    AND accuracy >= 0 AND accuracy <= 100
    AND stars >= 1 AND stars <= 3
    AND level_id >= 1 AND level_id <= 16
  );

-- Ensure public SELECT on games remains enabled for all roles
DROP POLICY IF EXISTS "Completed games are viewable by everyone for leaderboard" ON public.games;
CREATE POLICY "Completed games are viewable by everyone for leaderboard"
  ON public.games FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. Secure RPC Function: submit_guest_game
-- Validates game submission, performs canonical score recalculation, and checks plausibility
CREATE OR REPLACE FUNCTION public.submit_guest_game(
  p_guest_id TEXT,
  p_level_id INTEGER,
  p_number_count INTEGER,
  p_time_ms INTEGER,
  p_mistakes INTEGER,
  p_accuracy NUMERIC,
  p_score INTEGER,
  p_stars INTEGER,
  p_client_token TEXT DEFAULT NULL,
  p_game_mode TEXT DEFAULT 'standard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id UUID;
  v_expected_score INTEGER;
  v_multiplier NUMERIC;
  v_base_score NUMERIC;
  v_penalty NUMERIC;
  v_min_time INTEGER;
  v_is_flagged BOOLEAN := false;
  v_flag_reason TEXT := null;
BEGIN
  -- Input Validation
  IF p_guest_id IS NULL OR length(trim(p_guest_id)) < 6 THEN
    RAISE EXCEPTION 'Invalid guest_id';
  END IF;

  IF p_level_id < 1 OR p_level_id > 16 THEN
    RAISE EXCEPTION 'Invalid level_id';
  END IF;

  IF p_number_count != p_level_id + 4 THEN
    RAISE EXCEPTION 'Invalid number_count for level';
  END IF;

  IF p_time_ms <= 0 THEN
    RAISE EXCEPTION 'Invalid time_ms';
  END IF;

  -- Anti-Replay: Duplicate token prevention
  IF p_client_token IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.games WHERE client_token = p_client_token) THEN
      SELECT id INTO v_game_id FROM public.games WHERE client_token = p_client_token LIMIT 1;
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'game_id', v_game_id
      );
    END IF;
  END IF;

  -- Canonical Scoring Rules:
  -- Base Score = max(0, 100000 - time_ms / 10)
  -- Penalty = mistakes * 500
  -- Final Score = max(0, round((Base Score - Penalty) * Multiplier))
  -- Multipliers: 1-3: 1.0, 4-7: 1.2, 8-11: 1.5, 12-14: 1.8, 15-16: 2.2
  v_multiplier := CASE
    WHEN p_level_id <= 3 THEN 1.0
    WHEN p_level_id <= 7 THEN 1.2
    WHEN p_level_id <= 11 THEN 1.5
    WHEN p_level_id <= 14 THEN 1.8
    ELSE 2.2
  END;

  v_base_score := GREATEST(0, 100000 - (p_time_ms / 10.0));
  v_penalty := p_mistakes * 500;
  v_expected_score := GREATEST(0, ROUND((v_base_score - v_penalty) * v_multiplier));

  -- Minimum Human-Plausible Time Check (Anti-Cheat)
  v_min_time := 500 + (p_level_id * 100);
  IF p_time_ms < v_min_time THEN
    v_is_flagged := true;
    v_flag_reason := 'IMPLAUSIBLE_TIME: ' || p_time_ms || 'ms < min ' || v_min_time || 'ms';
  ELSIF ABS(p_score - v_expected_score) > 200 THEN
    v_is_flagged := true;
    v_flag_reason := 'SCORE_DISCREPANCY: client ' || p_score || ' vs expected ' || v_expected_score;
  END IF;

  -- Insert guest game
  INSERT INTO public.games (
    user_id,
    guest_id,
    level_id,
    number_count,
    time_ms,
    mistakes,
    accuracy,
    score,
    stars,
    game_mode,
    status,
    client_token,
    is_flagged,
    flag_reason,
    is_verified,
    completed_at
  ) VALUES (
    NULL,
    trim(p_guest_id),
    p_level_id,
    p_number_count,
    p_time_ms,
    p_mistakes,
    p_accuracy,
    p_score,
    p_stars,
    COALESCE(p_game_mode, 'standard'),
    'completed',
    p_client_token,
    v_is_flagged,
    v_flag_reason,
    false,
    now()
  )
  RETURNING id INTO v_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'is_flagged', v_is_flagged,
    'verified_score', v_expected_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_game TO anon, authenticated;
