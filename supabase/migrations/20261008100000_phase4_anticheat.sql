-- ============================================================
-- Number Hunt Phase 4 — Anti-Cheat & Admin Schema
-- Run AFTER phase3_schema.sql
-- ============================================================

-- ─── 1. ADMIN ROLES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin', 'superadmin')),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  granted_by UUID REFERENCES public.profiles(id)
);

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users can read their own admin role"
  ON public.admin_roles FOR SELECT
  USING (auth.uid() = user_id);


-- ─── 2. ADD MODERATION COLUMNS TO GAMES ─────────────────────
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_flagged     BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS flag_reason    TEXT,
  ADD COLUMN IF NOT EXISTS is_verified    BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS verified_by    UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS verified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_token   TEXT;

DROP POLICY IF EXISTS "Admins can update games" ON public.games;
CREATE POLICY "Admins can update games"
  ON public.games FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete games" ON public.games;
CREATE POLICY "Admins can delete games"
  ON public.games FOR DELETE
  USING (public.is_admin());

-- ─── 3. ADD MODERATION COLUMNS TO DAILY CHALLENGE SCORES ────
ALTER TABLE public.daily_challenge_scores
  ADD COLUMN IF NOT EXISTS is_flagged     BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS flag_reason    TEXT,
  ADD COLUMN IF NOT EXISTS is_verified    BOOLEAN DEFAULT false NOT NULL;

-- ─── 4. BANNED USERS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banned_users (
  user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  banned_by   UUID REFERENCES public.profiles(id),
  reason      TEXT NOT NULL,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banned users list visible to admins only"
  ON public.banned_users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage bans"
  ON public.banned_users FOR ALL
  USING (public.is_admin());

-- ─── 5. SCORE SUBMISSION TOKENS (Anti-Replay) ────────────────
CREATE TABLE IF NOT EXISTS public.game_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id    INTEGER NOT NULL,
  issued_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  used        BOOLEAN DEFAULT false NOT NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes') NOT NULL
);

ALTER TABLE public.game_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own game tokens"
  ON public.game_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own tokens"
  ON public.game_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_game_tokens_user ON public.game_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_game_tokens_expires ON public.game_tokens(expires_at);

-- ─── 6. RATE LIMITING TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_count INTEGER DEFAULT 0 NOT NULL,
  window_start    TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_submission TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rate limits accessible to owner or admins"
  ON public.submission_rate_limits FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid())
  );

-- ─── 7. INDEXES FOR MODERATION QUERIES ───────────────────────
CREATE INDEX IF NOT EXISTS idx_games_flagged ON public.games(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_games_user_score ON public.games(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_banned_active ON public.banned_users(is_active) WHERE is_active = true;

-- ─── 8. MINIMUM TIME CONSTRAINTS PER LEVEL ───────────────────
CREATE TABLE IF NOT EXISTS public.level_time_limits (
  level_id     INTEGER PRIMARY KEY CHECK (level_id >= 1 AND level_id <= 16),
  number_count INTEGER NOT NULL,
  min_time_ms  INTEGER NOT NULL,
  par_time_ms  INTEGER NOT NULL
);

INSERT INTO public.level_time_limits (level_id, number_count, min_time_ms, par_time_ms) VALUES
  (1,  5,   600,   3000),
  (2,  6,   700,   3600),
  (3,  7,   800,   4200),
  (4,  8,   900,   4800),
  (5,  9,  1000,   5400),
  (6,  10, 1100,   6000),
  (7,  11, 1200,   6600),
  (8,  12, 1300,   7200),
  (9,  13, 1400,   7800),
  (10, 14, 1500,   8400),
  (11, 15, 1600,   9000),
  (12, 16, 1700,   9600),
  (13, 17, 1800,  10200),
  (14, 18, 1900,  10800),
  (15, 19, 2000,  11400),
  (16, 20, 2100,  12000)
ON CONFLICT (level_id) DO NOTHING;

ALTER TABLE public.level_time_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time limits are public"
  ON public.level_time_limits FOR SELECT
  USING (true);

-- ─── 9. AUTO-FLAG FUNCTION ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_flag_suspicious_game()
RETURNS trigger AS $$
DECLARE
  min_time INTEGER;
  flag_msg  TEXT := NULL;
BEGIN
  SELECT min_time_ms INTO min_time
  FROM public.level_time_limits
  WHERE level_id = NEW.level_id;

  IF min_time IS NOT NULL AND NEW.time_ms < min_time THEN
    flag_msg := 'TIME_TOO_FAST: ' || NEW.time_ms || 'ms (min=' || min_time || 'ms)';
  END IF;

  IF NEW.score > ROUND((100000 - NEW.time_ms::NUMERIC / 10) * 2.2) THEN
    flag_msg := COALESCE(flag_msg || ' | ', '') ||
      'SCORE_EXCEEDS_MAX: score=' || NEW.score;
  END IF;

  IF NEW.mistakes = 0 AND NEW.accuracy < 99.0 THEN
    flag_msg := COALESCE(flag_msg || ' | ', '') || 'ACCURACY_MISMATCH';
  END IF;

  IF NEW.stars = 3 AND NEW.mistakes > 1 THEN
    flag_msg := COALESCE(flag_msg || ' | ', '') || 'STARS_MISTAKE_MISMATCH';
  END IF;

  IF flag_msg IS NOT NULL THEN
    NEW.is_flagged := true;
    NEW.flag_reason := flag_msg;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_flag_game ON public.games;
CREATE TRIGGER trg_auto_flag_game
  BEFORE INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.auto_flag_suspicious_game();

-- ─── 10. RATE LIMIT FUNCTION ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window TIMESTAMPTZ;
  v_limit INTEGER := 60;
BEGIN
  SELECT submission_count, window_start
  INTO v_count, v_window
  FROM public.submission_rate_limits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.submission_rate_limits (user_id, submission_count, window_start, last_submission)
    VALUES (p_user_id, 1, now(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET submission_count = 1, window_start = now(), last_submission = now();
    RETURN TRUE;
  END IF;

  IF v_window < now() - INTERVAL '1 hour' THEN
    UPDATE public.submission_rate_limits
    SET submission_count = 1, window_start = now(), last_submission = now()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;

  IF v_count >= v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.submission_rate_limits
  SET submission_count = submission_count + 1,
      last_submission = now()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 11. IS ADMIN HELPER FUNCTION ────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 12. ADMIN VIEWS ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_flagged_games AS
  SELECT
    g.id,
    g.user_id,
    p.username,
    p.display_name,
    p.avatar,
    g.level_id,
    g.number_count,
    g.time_ms,
    g.mistakes,
    g.accuracy,
    g.score,
    g.stars,
    g.is_flagged,
    g.flag_reason,
    g.is_verified,
    g.completed_at,
    g.created_at,
    CASE WHEN b.user_id IS NOT NULL AND b.is_active THEN true ELSE false END AS is_banned
  FROM public.games g
  JOIN public.profiles p ON g.user_id = p.id
  LEFT JOIN public.banned_users b ON g.user_id = b.user_id
  WHERE g.is_flagged = true
  ORDER BY g.created_at DESC;

CREATE OR REPLACE VIEW public.v_admin_overview AS
  SELECT
    (SELECT COUNT(*) FROM public.profiles) AS total_players,
    (SELECT COUNT(*) FROM public.games) AS total_games,
    (SELECT COUNT(*) FROM public.games WHERE is_flagged = true) AS flagged_games,
    (SELECT COUNT(*) FROM public.games WHERE is_verified = true) AS verified_games,
    (SELECT COUNT(*) FROM public.banned_users WHERE is_active = true) AS active_bans,
    (SELECT COUNT(*) FROM public.daily_challenges) AS daily_challenges_run,
    (SELECT COUNT(*) FROM public.games WHERE created_at > now() - INTERVAL '24 hours') AS games_last_24h,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - INTERVAL '24 hours') AS new_players_last_24h;

-- ─── 13. GRANTS FOR ADMIN TABLES & VIEWS ────────────────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.v_flagged_games TO anon, authenticated;
GRANT SELECT ON public.v_admin_overview TO anon, authenticated;

