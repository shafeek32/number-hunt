import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../src/services/adminService';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe('Admin Analytics & Metrics (Section 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates registered users and guest players into accurate metrics', async () => {
    // Mock profiles count
    const mockProfiles = {
      count: 5,
      error: null,
    };

    // Mock games rows with a mix of registered and guest games
    const now = new Date().toISOString();
    const mockGamesData = [
      {
        id: 'g1',
        user_id: 'u-1',
        guest_id: null,
        level_id: 1,
        number_count: 5,
        time_ms: 8000,
        mistakes: 0,
        accuracy: 100,
        score: 99200,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: true,
        completed_at: now,
        created_at: now,
      },
      {
        id: 'g2',
        user_id: null,
        guest_id: 'guest_player_1',
        level_id: 2,
        number_count: 6,
        time_ms: 9000,
        mistakes: 1,
        accuracy: 85,
        score: 98600,
        stars: 2,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: false,
        completed_at: now,
        created_at: now,
      },
      {
        id: 'g3',
        user_id: null,
        guest_id: 'guest_player_2',
        level_id: 3,
        number_count: 7,
        time_ms: 11000,
        mistakes: 0,
        accuracy: 100,
        score: 98900,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: false,
        completed_at: now,
        created_at: now,
      },
      {
        id: 'g4',
        user_id: null,
        guest_id: 'guest_player_1', // same guest playing second game
        level_id: 4,
        number_count: 8,
        time_ms: 12000,
        mistakes: 0,
        accuracy: 100,
        score: 118560,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: false,
        completed_at: now,
        created_at: now,
      },
    ];

    function mockQueryChain(result: any) {
      const chain: any = {
        select: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        range: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        not: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      };
      return chain;
    }

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return mockQueryChain({
          data: [
            { id: 'u-1', username: 'hunter1', display_name: 'Hunter 1', avatar: '⚡' },
          ],
          count: 5,
          error: null,
        });
      }
      if (table === 'games') {
        return mockQueryChain({
          data: mockGamesData,
          count: mockGamesData.length,
          error: null,
        });
      }
      if (table === 'game_tokens') {
        return mockQueryChain({
          data: [],
          count: 0,
          error: null,
        });
      }
      return mockQueryChain({ data: [], error: null });
    });

    const metrics = await adminService.getDashboardMetrics();

    // Verification:
    // Total registered: 5
    expect(metrics.registeredUsersCount).toBe(5);
    expect(metrics.totalUsers).toBe(5);
    // Unique guests: 2 ('guest_player_1', 'guest_player_2')
    expect(metrics.guestPlayersCount).toBe(2);
    // Total players: 5 + 2 = 7
    expect(metrics.totalPlayers).toBe(7);
    // Total games completed: 4
    expect(metrics.totalGamesCompleted).toBe(4);
    // Registered games count: 1
    expect(metrics.registeredGamesCount).toBe(1);
    // Guest games count: 3
    expect(metrics.guestGamesCount).toBe(3);
    // Valid scores: 4 (none flagged)
    expect(metrics.totalValidScores).toBe(4);
    // Games completed today: 4
    expect(metrics.gamesCompletedToday).toBe(4);
  });

  it('throws an informative error if a query fails instead of silently returning 0', async () => {
    function mockQueryChain(result: any) {
      const chain: any = {
        select: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        range: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        not: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      };
      return chain;
    }

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return mockQueryChain({
          data: null,
          error: { message: 'permission denied for table profiles (code 42501)' },
        });
      }
      return mockQueryChain({ data: [], error: null });
    });

    await expect(adminService.getDashboardMetrics()).rejects.toThrow(
      /permission denied for table profiles/
    );
  });

  it('maps guest records in games history properly', async () => {
    const mockGames = [
      {
        id: 'game-123',
        user_id: null,
        guest_id: 'guest_test_abc',
        level_id: 1,
        number_count: 5,
        time_ms: 7500,
        mistakes: 0,
        accuracy: 100,
        score: 99250,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: false,
        completed_at: new Date().toISOString(),
        profiles: null,
      },
    ];

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockGames,
        count: 1,
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(chain);

    const result = await adminService.getGamesList();
    expect(result.games.length).toBe(1);
    const game = result.games[0];
    expect(game.isGuest).toBe(true);
    expect(game.userId).toBeNull();
    expect(game.guestId).toBe('guest_test_abc');
    expect(game.username).toBe('guest_test');
  });

  it('retrieves guest player dossier from Supabase games', async () => {
    const guestId = 'guest_player_99';
    const mockGuestGames = [
      {
        id: 'gg-1',
        user_id: null,
        guest_id: guestId,
        level_id: 1,
        number_count: 5,
        time_ms: 6000,
        mistakes: 0,
        accuracy: 100,
        score: 99400,
        stars: 3,
        game_mode: 'standard',
        status: 'completed',
        is_flagged: false,
        is_verified: false,
        completed_at: new Date().toISOString(),
      },
    ];

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockGuestGames, error: null }),
    };

    (supabase.from as any).mockReturnValue(chain);

    const dossier = await adminService.getUserDetail(guestId);
    expect(dossier).not.toBeNull();
    expect(dossier!.profile.id).toBe(guestId);
    expect(dossier!.stats.total_games).toBe(1);
    expect(dossier!.stats.best_score).toBe(99400);
  });
});
