import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameService } from '../src/services/gameService';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

describe('gameService — Guest & Registered Game Persistence (Sections 2 & 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a guest game via submit_guest_game RPC', async () => {
    const mockRpcResponse = {
      data: {
        success: true,
        game_id: 'db-game-uuid-1',
        verified_score: 99000,
        is_flagged: false,
      },
      error: null,
    };
    (supabase.rpc as any).mockResolvedValueOnce(mockRpcResponse);

    const result = await gameService.saveGame({
      guestId: 'guest_abc123def456',
      levelId: 1,
      numberCount: 5,
      timeMs: 10000,
      mistakes: 0,
      accuracy: 100,
      score: 99000,
      stars: 3,
      clientToken: 'token_xyz_1',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('submit_guest_game', {
      p_guest_id: 'guest_abc123def456',
      p_level_id: 1,
      p_number_count: 5,
      p_time_ms: 10000,
      p_mistakes: 0,
      p_accuracy: 100,
      p_score: 99000,
      p_stars: 3,
      p_client_token: 'token_xyz_1',
      p_game_mode: 'standard',
    });

    expect(result).not.toBeNull();
    expect(result?.user_id).toBeNull();
    expect(result?.guest_id).toBe('guest_abc123def456');
    expect(result?.score).toBe(99000);
    expect(result?.is_verified).toBe(false);
  });

  it('falls back to direct insert if RPC is unavailable or errors', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'function submit_guest_game does not exist' },
    });

    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'inserted-uuid-2',
        user_id: null,
        guest_id: 'guest_fallback_1',
        level_id: 1,
        number_count: 5,
        time_ms: 12000,
        mistakes: 0,
        accuracy: 100,
        score: 98800,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        client_token: 'token_fallback_1',
        completed_at: new Date().toISOString(),
      },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    const result = await gameService.saveGame({
      guestId: 'guest_fallback_1',
      levelId: 1,
      numberCount: 5,
      timeMs: 12000,
      mistakes: 0,
      accuracy: 100,
      score: 98800,
      stars: 3,
      clientToken: 'token_fallback_1',
    });

    expect(supabase.from).toHaveBeenCalledWith('games');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: null,
      guest_id: 'guest_fallback_1',
      score: 98800,
      status: 'completed',
    }));
    expect(result?.guest_id).toBe('guest_fallback_1');
    expect(result?.user_id).toBeNull();
  });

  it('preserves registered player ID and stats update on registered gameplay', async () => {
    const mockSavedGame = {
      id: 'reg-game-uuid',
      user_id: 'user-uuid-1234',
      guest_id: null,
      level_id: 3,
      number_count: 7,
      time_ms: 15000,
      mistakes: 1,
      accuracy: 85,
      score: 95000,
      stars: 2,
      game_mode: 'standard',
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockSavedGame, error: null }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ level_id: 3, stars: 2 }], error: null }),
          }),
        };
      }
      if (table === 'player_stats') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_id: 'user-uuid-1234',
                  total_games: 5,
                  best_score: 90000,
                  highest_level: 3,
                },
                error: null,
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }
      return {};
    });

    const result = await gameService.saveGame({
      userId: 'user-uuid-1234',
      levelId: 3,
      numberCount: 7,
      timeMs: 15000,
      mistakes: 1,
      accuracy: 85,
      score: 95000,
      stars: 2,
    });

    expect(result?.user_id).toBe('user-uuid-1234');
    expect(result?.guest_id).toBeNull();
    expect(result?.score).toBe(95000);
  });
});
