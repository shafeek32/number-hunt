// Number Hunt — Supabase Edge Function: validate-score
// Performs server-side score validation before persisting to the database.
// Called by the client after a game completes.
//
// Request body (JSON):
//   { userId, levelId, numberCount, timeMs, mistakes, accuracy, score, stars, token }
//
// Response:
//   { valid: true, gameId }  — score accepted and saved
//   { valid: false, reason } — score rejected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DIFFICULTY_MULTIPLIER: Record<number, number> = {
  1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0,       // easy
  5: 1.2, 6: 1.2, 7: 1.2, 8: 1.2,       // normal
  9: 1.5, 10: 1.5, 11: 1.5,              // hard
  12: 1.8, 13: 1.8, 14: 1.8,             // very-hard
  15: 2.2, 16: 2.2,                       // extreme
};

const MIN_TIME_MS: Record<number, number> = {
  1: 600,  2: 700,  3: 800,  4: 900,
  5: 1000, 6: 1100, 7: 1200, 8: 1300,
  9: 1400, 10: 1500, 11: 1600, 12: 1700,
  13: 1800, 14: 1900, 15: 2000, 16: 2100,
};

const MISTAKE_PENALTY = 500;

function serverCalculateScore(timeMs: number, mistakes: number, levelId: number): number {
  const multiplier = DIFFICULTY_MULTIPLIER[levelId] ?? 1.0;
  const baseScore = Math.max(0, 100000 - timeMs / 10);
  const penalty = mistakes * MISTAKE_PENALTY;
  return Math.max(0, Math.round((baseScore - penalty) * multiplier));
}

function serverCalculateAccuracy(numberCount: number, mistakes: number): number {
  const totalAttempts = numberCount + mistakes;
  return Math.round((numberCount / totalAttempts) * 10000) / 100;
}

function serverCalculateStars(mistakes: number, accuracy: number): number {
  if (mistakes === 0 || (mistakes <= 1 && accuracy >= 90)) return 3;
  if (mistakes <= 2 || accuracy >= 80) return 2;
  return 1;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ valid: false, reason: 'Method not allowed' }, { status: 405 });
  }

  // Parse body
  let body: {
    userId?: string;
    levelId?: number;
    numberCount?: number;
    timeMs?: number;
    mistakes?: number;
    accuracy?: number;
    score?: number;
    stars?: number;
    token?: string;
    completedAt?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ valid: false, reason: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, levelId, numberCount, timeMs, mistakes, accuracy, score, stars, token, completedAt } = body;

  // ─── 1. FIELD VALIDATION ──────────────────────────────────────
  if (!userId || !levelId || !numberCount || timeMs === undefined || mistakes === undefined || !score) {
    return Response.json({ valid: false, reason: 'Missing required fields' }, { status: 400 });
  }

  if (levelId < 1 || levelId > 16) {
    return Response.json({ valid: false, reason: 'Invalid level_id' }, { status: 400 });
  }

  if (numberCount !== levelId + 4) {
    return Response.json({ valid: false, reason: 'numberCount does not match levelId' }, { status: 400 });
  }

  // ─── 2. ANTI-CHEAT: TIME VALIDATION ──────────────────────────
  const minTime = MIN_TIME_MS[levelId] ?? 600;
  if (timeMs < minTime) {
    return Response.json(
      { valid: false, reason: `TIME_TOO_FAST: ${timeMs}ms < minimum ${minTime}ms for level ${levelId}` },
      { status: 422 }
    );
  }

  // ─── 3. ANTI-CHEAT: SCORE RECOMPUTATION ──────────────────────
  const expectedScore = serverCalculateScore(timeMs, mistakes, levelId);
  const scoreTolerance = 100; // Allow minor floating-point drift
  if (Math.abs(score - expectedScore) > scoreTolerance) {
    return Response.json(
      { valid: false, reason: `SCORE_MISMATCH: client=${score} server=${expectedScore}` },
      { status: 422 }
    );
  }

  // ─── 4. ANTI-CHEAT: ACCURACY RECOMPUTATION ───────────────────
  const expectedAccuracy = serverCalculateAccuracy(numberCount, mistakes);
  const accTolerance = 2.0;
  if (accuracy !== undefined && Math.abs(accuracy - expectedAccuracy) > accTolerance) {
    return Response.json(
      { valid: false, reason: `ACCURACY_MISMATCH: client=${accuracy} server=${expectedAccuracy}` },
      { status: 422 }
    );
  }

  // ─── 5. ANTI-CHEAT: STARS RECOMPUTATION ──────────────────────
  const expectedStars = serverCalculateStars(mistakes, expectedAccuracy);
  if (stars !== undefined && stars !== expectedStars) {
    return Response.json(
      { valid: false, reason: `STARS_MISMATCH: client=${stars} server=${expectedStars}` },
      { status: 422 }
    );
  }

  // ─── 6. SUPABASE ADMIN OPERATIONS ────────────────────────────
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // ─── 7. VERIFY JWT / USER IDENTITY ───────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ valid: false, reason: 'Unauthorized: missing token' }, { status: 401 });
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !user || user.id !== userId) {
    return Response.json({ valid: false, reason: 'Unauthorized: user mismatch' }, { status: 401 });
  }

  // ─── 8. CHECK IF USER IS BANNED ──────────────────────────────
  const { data: banRecord } = await supabaseAdmin
    .from('banned_users')
    .select('user_id, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (banRecord) {
    const isExpired = banRecord.expires_at && new Date(banRecord.expires_at) < new Date();
    if (!isExpired) {
      return Response.json({ valid: false, reason: 'BANNED: account is suspended' }, { status: 403 });
    }
    // Auto-lift expired ban
    await supabaseAdmin.from('banned_users').update({ is_active: false }).eq('user_id', userId);
  }

  // ─── 9. RATE LIMIT CHECK ─────────────────────────────────────
  const { data: rateLimitOk } = await supabaseAdmin
    .rpc('check_submission_rate_limit', { p_user_id: userId });

  if (!rateLimitOk) {
    return Response.json({ valid: false, reason: 'RATE_LIMITED: too many submissions' }, { status: 429 });
  }

  // ─── 10. TOKEN VALIDATION (Anti-Replay) ──────────────────────
  if (token) {
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('game_tokens')
      .select('used, expires_at, level_id')
      .eq('token', token)
      .eq('user_id', userId)
      .maybeSingle();

    if (!tokenErr && tokenRow) {
      if (tokenRow.used) {
        return Response.json({ valid: false, reason: 'TOKEN_REPLAYED: token already used' }, { status: 422 });
      }
      if (new Date(tokenRow.expires_at) < new Date()) {
        return Response.json({ valid: false, reason: 'TOKEN_EXPIRED' }, { status: 422 });
      }
      if (tokenRow.level_id !== levelId) {
        return Response.json({ valid: false, reason: 'TOKEN_LEVEL_MISMATCH' }, { status: 422 });
      }
      // Mark token as used
      await supabaseAdmin
        .from('game_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);
    }
    // If token not found, we allow submission but without replay protection (graceful)
  }

  // ─── 11. PERSIST VALIDATED SCORE ─────────────────────────────
  const { data: savedGame, error: saveError } = await supabaseAdmin
    .from('games')
    .insert({
      user_id: userId,
      level_id: levelId,
      number_count: numberCount,
      time_ms: timeMs,
      mistakes,
      accuracy: expectedAccuracy,  // Use server-computed value
      score: expectedScore,         // Use server-computed value
      stars: expectedStars,         // Use server-computed value
      completed_at: completedAt ?? new Date().toISOString(),
      client_token: token ?? null,
    })
    .select('id')
    .single();

  if (saveError) {
    console.error('Failed to save game:', saveError.message);
    return Response.json({ valid: false, reason: 'Database error: ' + saveError.message }, { status: 500 });
  }

  // ─── 12. UPDATE PLAYER STATS (best effort) ───────────────────
  try {
    const { data: currentStats } = await supabaseAdmin
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const totalGames = (currentStats?.total_games ?? 0) + 1;
    const perfectGames = (currentStats?.perfect_games ?? 0) + (mistakes === 0 ? 1 : 0);
    const bestScore = Math.max(currentStats?.best_score ?? 0, expectedScore);
    const bestTimeMs =
      currentStats?.best_time_ms == null
        ? timeMs
        : Math.min(currentStats.best_time_ms, timeMs);
    const highestLevel = Math.max(currentStats?.highest_level ?? 1, Math.min(16, levelId + 1));

    const { data: allGames } = await supabaseAdmin
      .from('games')
      .select('level_id, stars')
      .eq('user_id', userId);

    const levelStarsMap: Record<number, number> = {};
    (allGames ?? []).forEach((g: { level_id: number; stars: number }) => {
      levelStarsMap[g.level_id] = Math.max(levelStarsMap[g.level_id] ?? 0, g.stars);
    });
    const totalStars = Object.values(levelStarsMap).reduce((a: number, b: number) => a + b, 0);

    await supabaseAdmin.from('player_stats').upsert({
      user_id: userId,
      total_games: totalGames,
      perfect_games: perfectGames,
      best_score: bestScore,
      best_time_ms: bestTimeMs,
      highest_level: highestLevel,
      total_stars: totalStars,
      updated_at: new Date().toISOString(),
    });
  } catch (statsErr) {
    console.warn('Stats update failed (non-fatal):', statsErr);
  }

  return Response.json({
    valid: true,
    gameId: savedGame.id,
    serverScore: expectedScore,
    serverAccuracy: expectedAccuracy,
    serverStars: expectedStars,
  });
});
