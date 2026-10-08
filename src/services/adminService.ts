/**
 * adminService — Phase 5
 *
 * Data access layer for admin/moderator operations.
 * All calls require the current user to have a row in admin_roles.
 * Service-role key is NOT used here — all queries go through RLS.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AdminOverview {
  total_players: number;
  total_games: number;
  flagged_games: number;
  verified_games: number;
  active_bans: number;
  daily_challenges_run: number;
  games_last_24h: number;
  new_players_last_24h: number;
}

export interface FlaggedGame {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  level_id: number;
  number_count: number;
  time_ms: number;
  mistakes: number;
  accuracy: number;
  score: number;
  stars: number;
  is_flagged: boolean;
  flag_reason: string | null;
  is_verified: boolean;
  completed_at: string;
  created_at: string;
  is_banned: boolean;
}

export interface BannedUser {
  user_id: string;
  banned_at: string;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  profiles?: {
    username: string;
    display_name: string;
    avatar: string;
  };
}

export interface PlayerSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason?: string;
  total_games?: number;
  flagged_games?: number;
}

export const adminService = {
  /**
   * Check if the current user is an admin.
   */
  async isAdmin(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('admin_roles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  },

  /**
   * Fetch global stats for admin overview card.
   */
  async getOverview(): Promise<AdminOverview | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('v_admin_overview')
      .select('*')
      .maybeSingle();

    if (error || !data) return null;
    return data as AdminOverview;
  },

  /**
   * Fetch flagged games for moderation review.
   */
  async getFlaggedGames(options: {
    limit?: number;
    offset?: number;
    onlyUnverified?: boolean;
  } = {}): Promise<{ items: FlaggedGame[]; count: number }> {
    if (!isSupabaseConfigured) return { items: [], count: 0 };

    const { limit = 20, offset = 0, onlyUnverified = true } = options;

    let query = supabase
      .from('v_flagged_games')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (onlyUnverified) {
      query = query.eq('is_verified', false);
    }

    const { data, count, error } = await query;

    if (error) {
      console.warn('[adminService] getFlaggedGames error:', error.message);
      return { items: [], count: 0 };
    }

    return { items: (data ?? []) as FlaggedGame[], count: count ?? 0 };
  },

  /**
   * Mark a game as verified (clean) or re-flag it.
   */
  async verifyGame(gameId: string, verified: boolean): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('games')
      .update({
        is_verified: verified,
        is_flagged: !verified,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    return !error;
  },

  /**
   * Delete a flagged game (requires admin).
   */
  async deleteGame(gameId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    return !error;
  },

  /**
   * Fetch currently active bans.
   */
  async getActiveBans(limit = 20, offset = 0): Promise<{ items: BannedUser[]; count: number }> {
    if (!isSupabaseConfigured) return { items: [], count: 0 };

    const { data, count, error } = await supabase
      .from('banned_users')
      .select(`
        *,
        profiles!user_id (username, display_name, avatar)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('banned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('[adminService] getActiveBans error:', error.message);
      return { items: [], count: 0 };
    }

    return { items: (data ?? []) as BannedUser[], count: count ?? 0 };
  },

  /**
   * Ban a user. expires_at = null means permanent.
   */
  async banUser(params: {
    userId: string;
    reason: string;
    durationDays?: number; // undefined = permanent
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const expiresAt = params.durationDays
      ? new Date(Date.now() + params.durationDays * 86400 * 1000).toISOString()
      : null;

    const { error } = await supabase.from('banned_users').upsert({
      user_id: params.userId,
      banned_at: new Date().toISOString(),
      banned_by: user.id,
      reason: params.reason,
      expires_at: expiresAt,
      is_active: true,
    });

    return !error;
  },

  /**
   * Lift a ban immediately.
   */
  async unbanUser(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const { error } = await supabase
      .from('banned_users')
      .update({ is_active: false })
      .eq('user_id', userId);

    return !error;
  },

  /**
   * Search players by username.
   */
  async searchPlayers(query: string, limit = 10): Promise<PlayerSearchResult[]> {
    if (!isSupabaseConfigured || !query.trim()) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar,
        created_at
      `)
      .ilike('username', `%${query.trim()}%`)
      .limit(limit);

    if (error || !data) return [];

    // Augment with ban/admin status
    const userIds = data.map((p) => p.id);

    const [{ data: adminRows }, { data: banRows }] = await Promise.all([
      supabase.from('admin_roles').select('user_id').in('user_id', userIds),
      supabase.from('banned_users').select('user_id, reason').eq('is_active', true).in('user_id', userIds),
    ]);

    const adminSet = new Set((adminRows ?? []).map((r) => r.user_id));
    const banMap = new Map((banRows ?? []).map((r) => [r.user_id, r.reason]));

    return data.map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar: p.avatar,
      created_at: p.created_at,
      is_admin: adminSet.has(p.id),
      is_banned: banMap.has(p.id),
      ban_reason: banMap.get(p.id),
    }));
  },

  /**
   * Fetch recent games for a specific user (for moderation review).
   */
  async getUserGames(userId: string, limit = 20): Promise<FlaggedGame[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('games')
      .select(`
        id, user_id, level_id, number_count, time_ms,
        mistakes, accuracy, score, stars,
        is_flagged, flag_reason, is_verified, completed_at, created_at,
        profiles!user_id (username, display_name, avatar)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => {
      const prof = row.profiles as { username?: string; display_name?: string; avatar?: string } | null;
      return {
        id: row.id,
        user_id: row.user_id,
        username: prof?.username ?? '',
        display_name: prof?.display_name ?? '',
        avatar: prof?.avatar ?? '⚡',
        level_id: row.level_id,
        number_count: row.number_count,
        time_ms: row.time_ms,
        mistakes: row.mistakes,
        accuracy: row.accuracy,
        score: row.score,
        stars: row.stars,
        is_flagged: row.is_flagged,
        flag_reason: row.flag_reason,
        is_verified: row.is_verified,
        completed_at: row.completed_at,
        created_at: row.created_at,
        is_banned: false,
      };
    });
  },
};
