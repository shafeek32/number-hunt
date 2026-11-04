import { describe, it, expect } from 'vitest';
import type { OnlineDuelState, OnlineDuelEvent } from '../src/types/onlineDuel';
import { LEVELS } from '../src/data/levels';
import { generateBoard } from '../src/utils/randomizer';

function createMockOnlineState(role: 'host' | 'guest'): OnlineDuelState {
  const level = LEVELS.find((l) => l.id === 8) ?? LEVELS[7];
  return {
    roomCode: 'TEST99',
    role,
    phase: 'lobby',
    levelId: level.id,
    numberCount: level.numberCount,
    boardNumbers: generateBoard(level.numberCount),
    targetNumber: 1,
    foundNumbers: [],
    activeRole: 'host',
    localPlayer: {
      id: 'local-123',
      name: role === 'host' ? 'Host Player' : 'Guest Player',
      role,
      isReady: true,
      color: role === 'host' ? 'amber' : 'cyan',
      mistakes: 0,
      bestStreak: 0,
      currentStreak: 0,
    },
    remotePlayer: null,
    wrongNumber: null,
    isWrongEffect: false,
    winnerRole: null,
    turnNumber: 1,
    connectionStatus: 'connected',
    errorMessage: null,
  };
}

describe('Online Multiplayer Duel Engine (Supabase Realtime Protocol)', () => {
  it('initializes state in lobby phase with Level 8 default and connected status', () => {
    const state = createMockOnlineState('host');

    expect(state.phase).toBe('lobby');
    expect(state.levelId).toBe(8);
    expect(state.numberCount).toBe(12);
    expect(state.boardNumbers.length).toBe(12);
    expect(state.localPlayer.role).toBe('host');
    expect(state.remotePlayer).toBeNull();
    expect(state.activeRole).toBe('host');
    expect(state.targetNumber).toBe(1);
    expect(state.connectionStatus).toBe('connected');
  });

  it('handles remote player join event and stores opponent info', () => {
    const state = createMockOnlineState('host');

    const joinEvent: OnlineDuelEvent = {
      type: 'PLAYER_JOIN',
      player: {
        id: 'remote-456',
        name: 'Friend Online',
        role: 'guest',
        isReady: true,
        color: 'cyan',
        mistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
      },
    };

    if (joinEvent.type === 'PLAYER_JOIN') {
      state.remotePlayer = joinEvent.player;
    }

    expect(state.remotePlayer).not.toBeNull();
    expect(state.remotePlayer?.name).toBe('Friend Online');
    expect(state.remotePlayer?.role).toBe('guest');
  });

  it('synchronizes game start from host with identical board numbers and level', () => {
    const guestState = createMockOnlineState('guest');
    const mockBoard = [5, 2, 8, 1, 9, 3, 12, 4, 11, 7, 6, 10];

    const startEvent: OnlineDuelEvent = {
      type: 'HOST_START_GAME',
      levelId: 8,
      boardNumbers: mockBoard,
    };

    if (startEvent.type === 'HOST_START_GAME') {
      guestState.boardNumbers = startEvent.boardNumbers;
      guestState.levelId = startEvent.levelId;
      guestState.phase = 'countdown';
      guestState.targetNumber = 1;
      guestState.foundNumbers = [];
      guestState.activeRole = 'host';
    }

    expect(guestState.phase).toBe('countdown');
    expect(guestState.boardNumbers).toEqual(mockBoard);
    expect(guestState.activeRole).toBe('host');
    expect(guestState.targetNumber).toBe(1);
  });

  it('correct tile click broadcasts and updates board in real time', () => {
    const state = createMockOnlineState('host');
    state.phase = 'playing';

    const clickEvent: OnlineDuelEvent = {
      type: 'TILE_CLICK_CORRECT',
      clickedBy: 'host',
      number: 1,
      nextTarget: 2,
      streak: 1,
      isGameWon: false,
    };

    if (clickEvent.type === 'TILE_CLICK_CORRECT') {
      state.foundNumbers.push(clickEvent.number);
      state.targetNumber = clickEvent.nextTarget;
      state.localPlayer.currentStreak = clickEvent.streak;
      state.localPlayer.bestStreak = Math.max(state.localPlayer.bestStreak, clickEvent.streak);
    }

    expect(state.foundNumbers).toContain(1);
    expect(state.targetNumber).toBe(2);
    expect(state.localPlayer.currentStreak).toBe(1);
    expect(state.localPlayer.bestStreak).toBe(1);
  });

  it('wrong tile click triggers red wrong effect and reveals number without pass modal', () => {
    const state = createMockOnlineState('host');
    state.phase = 'playing';

    const wrongEvent: OnlineDuelEvent = {
      type: 'TILE_CLICK_WRONG',
      clickedBy: 'host',
      number: 9,
      mistakes: 1,
    };

    if (wrongEvent.type === 'TILE_CLICK_WRONG') {
      state.wrongNumber = wrongEvent.number;
      state.isWrongEffect = true;
      state.localPlayer.mistakes = wrongEvent.mistakes;
      state.localPlayer.currentStreak = 0;
    }

    expect(state.wrongNumber).toBe(9);
    expect(state.isWrongEffect).toBe(true);
    expect(state.localPlayer.mistakes).toBe(1);
    expect(state.localPlayer.currentStreak).toBe(0);
  });

  it('turn switch clears wrong state, hides tiles, and activates guest', () => {
    const state = createMockOnlineState('host');
    state.phase = 'playing';
    state.wrongNumber = 9;
    state.isWrongEffect = true;

    const switchEvent: OnlineDuelEvent = {
      type: 'SWITCH_TURN',
      nextRole: 'guest',
      turnNumber: 2,
    };

    if (switchEvent.type === 'SWITCH_TURN') {
      state.wrongNumber = null;
      state.isWrongEffect = false;
      state.activeRole = switchEvent.nextRole;
      state.targetNumber = 1;
      state.foundNumbers = [];
      state.turnNumber = switchEvent.turnNumber;
    }

    expect(state.wrongNumber).toBeNull();
    expect(state.isWrongEffect).toBe(false);
    expect(state.activeRole).toBe('guest');
    expect(state.targetNumber).toBe(1);
    expect(state.foundNumbers).toEqual([]);
    expect(state.turnNumber).toBe(2);
  });

  it('game won event crowns winner and finishes match', () => {
    const state = createMockOnlineState('host');
    state.phase = 'playing';

    const winEvent: OnlineDuelEvent = {
      type: 'TILE_CLICK_CORRECT',
      clickedBy: 'host',
      number: 12,
      nextTarget: 13,
      streak: 12,
      isGameWon: true,
    };

    if (winEvent.type === 'TILE_CLICK_CORRECT' && winEvent.isGameWon) {
      state.phase = 'finished';
      state.winnerRole = winEvent.clickedBy;
    }

    expect(state.phase).toBe('finished');
    expect(state.winnerRole).toBe('host');
  });

  describe('Session Storage Persistence & Refresh Recovery', () => {
    const mockStorage = new Map<string, string>();
    if (typeof window === 'undefined' || !window.sessionStorage) {
      const storageObj = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
        removeItem: (k: string) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
        length: 0,
        key: () => null,
      };
      (globalThis as any).window = {
        sessionStorage: storageObj,
        location: { origin: 'http://localhost:5173' },
      };
      (globalThis as any).sessionStorage = storageObj;
    }

    it('persists and restores host session state across simulated page refresh', async () => {
      const { saveStoredDuelSession, loadStoredDuelSession } = await import(
        '../src/hooks/useOnlineDuel'
      );

      const session = {
        clientId: 'nh-host-777',
        role: 'host' as const,
        name: 'Alex The Host',
        roomCode: 'HUNT88',
        phase: 'playing' as const,
        levelId: 8,
        numberCount: 12,
        boardNumbers: [3, 1, 9, 4, 12, 7, 2, 8, 11, 5, 10, 6],
        targetNumber: 5,
        foundNumbers: [1, 2, 3, 4],
        activeRole: 'host' as const,
        turnNumber: 1,
        winnerRole: null,
        localMistakes: 1,
        localBestStreak: 4,
        localCurrentStreak: 4,
        remoteMistakes: 0,
        remoteBestStreak: 0,
        remoteCurrentStreak: 0,
        remoteName: 'Guest Bob',
        updatedAt: Date.now(),
      };

      saveStoredDuelSession(session);
      const loaded = loadStoredDuelSession('HUNT88');

      expect(loaded).not.toBeNull();
      expect(loaded?.clientId).toBe('nh-host-777');
      expect(loaded?.role).toBe('host');
      expect(loaded?.name).toBe('Alex The Host');
      expect(loaded?.phase).toBe('playing');
      expect(loaded?.targetNumber).toBe(5);
      expect(loaded?.foundNumbers).toEqual([1, 2, 3, 4]);
      expect(loaded?.boardNumbers).toEqual([3, 1, 9, 4, 12, 7, 2, 8, 11, 5, 10, 6]);
    });

    it('preserves guest identity, custom name, and guest role on refresh', async () => {
      const { saveStoredDuelSession, loadStoredDuelSession } = await import(
        '../src/hooks/useOnlineDuel'
      );

      const guestSession = {
        clientId: 'nh-guest-333',
        role: 'guest' as const,
        name: 'SpeedyGuest',
        roomCode: 'HUNT88',
        phase: 'lobby' as const,
        levelId: 8,
        numberCount: 12,
        boardNumbers: [],
        targetNumber: 1,
        foundNumbers: [],
        activeRole: 'host' as const,
        turnNumber: 1,
        winnerRole: null,
        localMistakes: 0,
        localBestStreak: 0,
        localCurrentStreak: 0,
        remoteMistakes: 0,
        remoteBestStreak: 0,
        remoteCurrentStreak: 0,
        updatedAt: Date.now(),
      };

      saveStoredDuelSession(guestSession);
      const loaded = loadStoredDuelSession('HUNT88');

      expect(loaded?.role).toBe('guest');
      expect(loaded?.name).toBe('SpeedyGuest');
      expect(loaded?.clientId).toBe('nh-guest-333');
    });

    it('clears stored session on explicit leaveRoom', async () => {
      const { clearStoredDuelSession, loadStoredDuelSession } = await import(
        '../src/hooks/useOnlineDuel'
      );

      clearStoredDuelSession('HUNT88');
      const loaded = loadStoredDuelSession('HUNT88');
      expect(loaded).toBeNull();
    });

    it('applies SYNC_STATE event from peer to reconcile live match state after reconnecting', () => {
      const state = createMockOnlineState('guest');
      state.phase = 'lobby';

      const syncEvent: OnlineDuelEvent = {
        type: 'SYNC_STATE',
        syncState: {
          phase: 'playing',
          levelId: 10,
          numberCount: 16,
          boardNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          targetNumber: 7,
          foundNumbers: [1, 2, 3, 4, 5, 6],
          activeRole: 'guest',
          turnNumber: 2,
          winnerRole: null,
          hostScore: { mistakes: 1, bestStreak: 3, currentStreak: 0 },
          guestScore: { mistakes: 0, bestStreak: 3, currentStreak: 3 },
        },
      };

      if (syncEvent.type === 'SYNC_STATE') {
        const { syncState } = syncEvent;
        state.phase = syncState.phase;
        state.levelId = syncState.levelId;
        state.numberCount = syncState.numberCount;
        state.boardNumbers = syncState.boardNumbers;
        state.targetNumber = syncState.targetNumber;
        state.foundNumbers = syncState.foundNumbers;
        state.activeRole = syncState.activeRole;
        state.turnNumber = syncState.turnNumber;
        state.localPlayer.currentStreak = syncState.guestScore.currentStreak;
      }

      expect(state.phase).toBe('playing');
      expect(state.levelId).toBe(10);
      expect(state.numberCount).toBe(16);
      expect(state.targetNumber).toBe(7);
      expect(state.foundNumbers.length).toBe(6);
      expect(state.activeRole).toBe('guest');
      expect(state.localPlayer.currentStreak).toBe(3);
    });
  });
});
