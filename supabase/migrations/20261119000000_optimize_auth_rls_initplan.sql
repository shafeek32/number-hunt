-- ==============================================================================
-- Migration: Fix Supabase Auth RLS Initialization Plan Linter
--
-- Replaces bare auth.<function>() calls in RLS policies with (SELECT auth.<function>())
-- so PostgreSQL evaluates the session claims once per query (InitPlan) rather
-- than re-evaluating for every row.
-- ==============================================================================

-- 1. PROFILES
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- 2. GAMES
DROP POLICY IF EXISTS "Users can insert their own completed games" ON public.games;
CREATE POLICY "Users can insert their own completed games"
  ON public.games FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. PLAYER STATS
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.player_stats;
CREATE POLICY "Users can insert their own stats"
  ON public.player_stats FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.player_stats;
CREATE POLICY "Users can update their own stats"
  ON public.player_stats FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- 4. USER ACHIEVEMENTS
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5. DAILY CHALLENGE COMPLETIONS
DROP POLICY IF EXISTS "Users can insert their own daily challenge completions" ON public.daily_challenge_completions;
CREATE POLICY "Users can insert their own daily challenge completions"
  ON public.daily_challenge_completions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
