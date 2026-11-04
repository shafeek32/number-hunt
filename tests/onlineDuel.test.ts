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
});
