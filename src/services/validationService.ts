/**
 * validationService — Phase 4 Anti-Cheat
 *
 * Client-side plausibility checks that run BEFORE submitting a score.
 * These do not replace server-side validation — they are an early warning
 * layer to avoid unnecessary network calls for obviously invalid submissions.
 *
 * Server-side recomputation happens in the Supabase Edge Function
 * `supabase/functions/validate-score/index.ts`
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateScore, calculateStars } from '../utils/scoring';
import { calcAccuracy } from '../utils/gameEngine';
import type { Level } from '../types/game';

// Minimum completion times (ms) per level — mirrors server constants
const MIN_TIME_MS: Record<number, number> = {
  1: 600,  2: 700,  3: 800,  4: 900,
  5: 1000, 6: 1100, 7: 1200, 8: 1300,
  9: 1400, 10: 1500, 11: 1600, 12: 1700,
  13: 1800, 14: 1900, 15: 2000, 16: 2100,
};

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  /** Server-corrected score (if server accepted but corrected values) */
  serverScore?: number;
  serverAccuracy?: number;
  serverStars?: number;
  gameId?: string;
}

export interface SubmissionPayload {
  userId: string;
  levelId: number;
  numberCount: number;
  timeMs: number;
  mistakes: number;
  accuracy: number;
  score: number;
  stars: number;
  token?: string;
  completedAt?: string;
}

export const validationService = {
  /**
   * Client-side pre-validation. Quick sanity check before any network call.
   * Returns { valid: false, reason } to short-circuit suspicious submissions.
   */
  validateLocally(params: {
    level: Level;
    timeMs: number;
    mistakes: number;
    accuracy: number;
    score: number;
    stars: number;
  }): ValidationResult {
    const { level, timeMs, mistakes, accuracy, score, stars } = params;

    // 1. Time plausibility
    const minTime = MIN_TIME_MS[level.id] ?? 600;
    if (timeMs < minTime) {
      return { valid: false, reason: `TIME_TOO_FAST: ${timeMs}ms` };
    }

    // 2. Score plausibility — recompute and compare
    const expectedScore = calculateScore(timeMs, mistakes, level);
    if (Math.abs(score - expectedScore) > 200) {
      return { valid: false, reason: `SCORE_MISMATCH: got ${score}, expected ${expectedScore}` };
    }

    // 3. Accuracy plausibility
    const expectedAccuracy = calcAccuracy(level.numberCount, mistakes);
    if (Math.abs(accuracy - expectedAccuracy) > 2.0) {
      return { valid: false, reason: `ACCURACY_MISMATCH: got ${accuracy}, expected ${expectedAccuracy}` };
    }

    // 4. Stars plausibility
    const expectedStars = calculateStars(mistakes, expectedAccuracy);
    if (stars !== expectedStars) {
      return { valid: false, reason: `STARS_MISMATCH: got ${stars}, expected ${expectedStars}` };
    }

    // 5. Mistakes can't be negative
    if (mistakes < 0) {
      return { valid: false, reason: 'NEGATIVE_MISTAKES' };
    }

    return { valid: true };
  },

  /**
   * Issue a one-time anti-replay token before the game starts.
   * Returns the token string or null if Supabase is unconfigured.
   */
  async issueGameToken(userId: string, levelId: number): Promise<string | null> {
    if (!isSupabaseConfigured) return null;

    const token = `nh-${Date.now()}-${Math.random().toString(36).slice(2)}-${levelId}`;

    const { error } = await supabase.from('game_tokens').insert({
      token,
      user_id: userId,
      level_id: levelId,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    });

    if (error) {
      console.warn('[validationService] Failed to issue token:', error.message);
      return null;
    }

    return token;
  },

  /**
   * Submit a validated score to the Supabase Edge Function.
   * The Edge Function recomputes everything server-side and persists the result.
   *
   * Falls back to direct DB insert if Edge Functions are not deployed yet.
   */
  async submitValidatedScore(
    payload: SubmissionPayload,
    accessToken: string
  ): Promise<ValidationResult> {
    if (!isSupabaseConfigured) return { valid: false, reason: 'Supabase not configured' };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/validate-score`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as ValidationResult & { reason?: string };

      if (!response.ok || !data.valid) {
        return {
          valid: false,
          reason: data.reason ?? `HTTP ${response.status}`,
        };
      }

      return {
        valid: true,
        gameId: data.gameId,
        serverScore: data.serverScore,
        serverAccuracy: data.serverAccuracy,
        serverStars: data.serverStars,
      };
    } catch (err) {
      console.warn('[validationService] Edge Function unavailable, using fallback:', err);
      // Graceful fallback — the direct DB insert in gameService will still work
      return { valid: false, reason: 'EDGE_FUNCTION_UNAVAILABLE' };
    }
  },
};
