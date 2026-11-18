-- ==============================================================================
-- Migration: Fix Supabase Security Linter (0010_security_definer_view)
--
-- In PostgreSQL 15+, views default to security_invoker = false (acting as SECURITY DEFINER),
-- which bypasses Row Level Security (RLS) of the querying user.
--
-- This migration:
-- 1. Sets security_invoker = true on public.v_flagged_games & public.v_admin_overview
-- 2. Revokes public/anon access to prevent unauthenticated inspection of admin data
-- ==============================================================================

DO $$
BEGIN
  -- 1. Secure v_flagged_games
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_flagged_games') THEN
    ALTER VIEW public.v_flagged_games SET (security_invoker = true);
    REVOKE ALL ON public.v_flagged_games FROM anon;
    GRANT SELECT ON public.v_flagged_games TO authenticated;
  END IF;

  -- 2. Secure v_admin_overview
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_admin_overview') THEN
    ALTER VIEW public.v_admin_overview SET (security_invoker = true);
    REVOKE ALL ON public.v_admin_overview FROM anon;
    GRANT SELECT ON public.v_admin_overview TO authenticated;
  END IF;
END $$;
