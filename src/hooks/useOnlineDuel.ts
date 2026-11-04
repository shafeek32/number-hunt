import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LEVELS, getLevelById } from '../data/levels';
import { generateBoard } from '../utils/randomizer';
import type {
  OnlineRole,
  OnlineDuelState,
  OnlineDuelEvent,
} from '../types/onlineDuel';

function generateRandomClientId(): string {
  return 'nh-' + Math.random().toString(36).slice(2, 9);
}

export function useOnlineDuel(
  roomCode: string,
  initialRole: OnlineRole,
  initialPlayerName: string = ''
) {
  const localIdRef = useRef<string>(generateRandomClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultLevel = LEVELS.find((l) => l.id === 8) ?? LEVELS[7]; // Level 8 default

  const [state, setState] = useState<OnlineDuelState>(() => ({
    roomCode: roomCode.trim().toUpperCase(),
    role: initialRole,
    phase: 'lobby',
    levelId: defaultLevel.id,
    numberCount: defaultLevel.numberCount,
    boardNumbers: generateBoard(defaultLevel.numberCount),
    targetNumber: 1,
    foundNumbers: [],
    activeRole: 'host',
    localPlayer: {
      id: localIdRef.current,
      name:
        initialPlayerName.trim() ||
        (initialRole === 'host' ? 'Player 1 (Host)' : 'Player 2 (Guest)'),
      role: initialRole,
      isReady: true,
      color: initialRole === 'host' ? 'amber' : 'cyan',
      mistakes: 0,
      bestStreak: 0,
      currentStreak: 0,
    },
    remotePlayer: null,
    wrongNumber: null,
    isWrongEffect: false,
    winnerRole: null,
    turnNumber: 1,
    connectionStatus: isSupabaseConfigured ? 'connecting' : 'disconnected',
    errorMessage: isSupabaseConfigured
      ? null
      : 'Supabase credentials are not configured. Online multiplayer requires a live Supabase connection.',
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  // ──────────────────────────────────────────────────────────────────────────
  // BROADCAST HELPER
  // ──────────────────────────────────────────────────────────────────────────
  const broadcastEvent = useCallback((event: OnlineDuelEvent) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'game-event',
      payload: event,
    });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // SUPABASE REALTIME CHANNEL LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !roomCode) {
      return;
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();
    const channelName = `duel-room:${cleanRoomCode}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: localIdRef.current },
      },
    });

    channelRef.current = channel;

    // 1. Listen for Broadcast Game Events
    channel.on('broadcast', { event: 'game-event' }, ({ payload }) => {
      const event = payload as OnlineDuelEvent;
      handleRemoteEvent(event);
    });

    // 2. Listen for Presence Changes (Opponent Joined / Left)
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const allPresences: Array<{ id: string; name: string; role: OnlineRole }> = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as any[]).forEach((p) => {
          if (p && p.id) {
            allPresences.push(p);
          }
        });
      });

      // Find remote opponent
      const opponent = allPresences.find((p) => p.id !== localIdRef.current);
      if (opponent) {
        setState((prev) => {
          if (prev.remotePlayer && prev.remotePlayer.id === opponent.id) {
            return prev;
          }
          const opponentRole: OnlineRole = prev.role === 'host' ? 'guest' : 'host';
          return {
            ...prev,
            remotePlayer: {
              id: opponent.id,
              name: opponent.name || (opponentRole === 'host' ? 'Player 1 (Host)' : 'Player 2 (Guest)'),
              role: opponentRole,
              isReady: true,
              color: opponentRole === 'host' ? 'amber' : 'cyan',
              mistakes: 0,
              bestStreak: 0,
              currentStreak: 0,
            },
          };
        });

        // Greet opponent by broadcasting our player info so they have our name instantly
        broadcastEvent({
          type: 'PLAYER_JOIN',
          player: stateRef.current.localPlayer,
        });
      } else {
        setState((prev) => {
          if (!prev.remotePlayer) return prev;
          return {
            ...prev,
            remotePlayer: null,
          };
        });
      }
    });

    // 3. Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setState((prev) => ({ ...prev, connectionStatus: 'connected' }));

        // Track our presence in the room
        await channel.track({
          id: localIdRef.current,
          name: stateRef.current.localPlayer.name,
          role: stateRef.current.role,
          joinedAt: new Date().toISOString(),
        });

        // Broadcast player joined
        broadcastEvent({
          type: 'PLAYER_JOIN',
          player: stateRef.current.localPlayer,
        });
      } else if (status === 'CHANNEL_ERROR') {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'error',
          errorMessage: 'Failed to connect to duel room WebSocket channel.',
        }));
      } else if (status === 'TIMED_OUT') {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'error',
          errorMessage: 'Connection to duel room timed out.',
        }));
      }
    });

    return () => {
      if (wrongTimerRef.current) {
        clearTimeout(wrongTimerRef.current);
      }
      broadcastEvent({
        type: 'PLAYER_LEFT',
        role: stateRef.current.role,
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, broadcastEvent]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLE INCOMING REMOTE EVENTS
  // ──────────────────────────────────────────────────────────────────────────
  const handleRemoteEvent = useCallback((event: OnlineDuelEvent) => {
    switch (event.type) {
      case 'PLAYER_JOIN': {
        if (event.player.id !== localIdRef.current) {
          setState((prev) => ({
            ...prev,
            remotePlayer: event.player,
          }));
        }
        break;
      }

      case 'HOST_START_GAME': {
        const lvl = getLevelById(event.levelId) ?? defaultLevel;
        setState((prev) => ({
          ...prev,
          levelId: lvl.id,
          numberCount: lvl.numberCount,
          boardNumbers: event.boardNumbers,
          targetNumber: 1,
          foundNumbers: [],
          activeRole: 'host',
          phase: 'countdown',
          winnerRole: null,
          wrongNumber: null,
          isWrongEffect: false,
          turnNumber: 1,
        }));
        break;
      }

      case 'TILE_CLICK_CORRECT': {
        setState((prev) => {
          const nextFound = [...prev.foundNumbers, event.number];
          const isRemote = event.clickedBy !== prev.role;
          const updatedRemote = prev.remotePlayer
            ? {
                ...prev.remotePlayer,
                currentStreak: event.streak,
                bestStreak: Math.max(prev.remotePlayer.bestStreak, event.streak),
              }
            : null;

          return {
            ...prev,
            foundNumbers: nextFound,
            targetNumber: event.nextTarget,
            remotePlayer: isRemote ? updatedRemote : prev.remotePlayer,
            phase: event.isGameWon ? 'finished' : prev.phase,
            winnerRole: event.isGameWon ? event.clickedBy : prev.winnerRole,
          };
        });
        break;
      }

      case 'TILE_CLICK_WRONG': {
        setState((prev) => {
          const isRemote = event.clickedBy !== prev.role;
          const updatedRemote = prev.remotePlayer
            ? {
                ...prev.remotePlayer,
                mistakes: event.mistakes,
                currentStreak: 0,
              }
            : null;

          return {
            ...prev,
            wrongNumber: event.number,
            isWrongEffect: true,
            remotePlayer: isRemote ? updatedRemote : prev.remotePlayer,
          };
        });
        break;
      }

      case 'SWITCH_TURN': {
        setState((prev) => ({
          ...prev,
          wrongNumber: null,
          isWrongEffect: false,
          activeRole: event.nextRole,
          targetNumber: 1,
          foundNumbers: [],
          turnNumber: event.turnNumber,
        }));
        break;
      }

      case 'REMATCH_START': {
        const lvl = getLevelById(event.levelId) ?? defaultLevel;
        setState((prev) => ({
          ...prev,
          levelId: lvl.id,
          numberCount: lvl.numberCount,
          boardNumbers: event.boardNumbers,
          targetNumber: 1,
          foundNumbers: [],
          activeRole: 'host',
          phase: 'countdown',
          winnerRole: null,
          wrongNumber: null,
          isWrongEffect: false,
          turnNumber: 1,
          localPlayer: {
            ...prev.localPlayer,
            mistakes: 0,
            bestStreak: 0,
            currentStreak: 0,
          },
          remotePlayer: prev.remotePlayer
            ? {
                ...prev.remotePlayer,
                mistakes: 0,
                bestStreak: 0,
                currentStreak: 0,
              }
            : null,
        }));
        break;
      }

      case 'PLAYER_LEFT': {
        setState((prev) => ({
          ...prev,
          remotePlayer: null,
        }));
        break;
      }
    }
  }, [defaultLevel]);

  // ──────────────────────────────────────────────────────────────────────────
  // USER ACTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /** Host starts the game */
  const startGame = useCallback(
    (chosenLevelId: number = 8) => {
      const lvl = getLevelById(chosenLevelId) ?? defaultLevel;
      const boardNumbers = generateBoard(lvl.numberCount);

      setState((prev) => ({
        ...prev,
        levelId: lvl.id,
        numberCount: lvl.numberCount,
        boardNumbers,
        targetNumber: 1,
        foundNumbers: [],
        activeRole: 'host',
        phase: 'countdown',
        winnerRole: null,
        wrongNumber: null,
        isWrongEffect: false,
        turnNumber: 1,
      }));

      broadcastEvent({
        type: 'HOST_START_GAME',
        levelId: lvl.id,
        boardNumbers,
      });
    },
    [broadcastEvent, defaultLevel]
  );

  /** Countdown completes, begin playing */
  const startPlaying = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'playing',
    }));
  }, []);

  /** Handle tile click (only active player can click) */
  const handleNumberClick = useCallback(
    (num: number) => {
      const current = stateRef.current;
      if (current.phase !== 'playing') return;
      if (current.isWrongEffect) return;
      if (current.foundNumbers.includes(num)) return;
      if (current.activeRole !== current.role) return; // NOT MY TURN

      const myRole = current.role;
      const nextRole: OnlineRole = myRole === 'host' ? 'guest' : 'host';

      // 1. Correct number clicked
      if (num === current.targetNumber) {
        const nextFound = [...current.foundNumbers, num];
        const nextStreak = current.localPlayer.currentStreak + 1;
        const nextBestStreak = Math.max(current.localPlayer.bestStreak, nextStreak);
        const isGameWon = nextFound.length === current.numberCount;

        setState((prev) => ({
          ...prev,
          foundNumbers: nextFound,
          targetNumber: prev.targetNumber + 1,
          phase: isGameWon ? 'finished' : prev.phase,
          winnerRole: isGameWon ? myRole : prev.winnerRole,
          localPlayer: {
            ...prev.localPlayer,
            currentStreak: nextStreak,
            bestStreak: nextBestStreak,
          },
        }));

        broadcastEvent({
          type: 'TILE_CLICK_CORRECT',
          clickedBy: myRole,
          number: num,
          nextTarget: current.targetNumber + 1,
          streak: nextStreak,
          isGameWon,
        });

        return;
      }

      // 2. Wrong number clicked
      const updatedMistakes = current.localPlayer.mistakes + 1;

      setState((prev) => ({
        ...prev,
        wrongNumber: num,
        isWrongEffect: true,
        localPlayer: {
          ...prev.localPlayer,
          mistakes: updatedMistakes,
          currentStreak: 0,
        },
      }));

      broadcastEvent({
        type: 'TILE_CLICK_WRONG',
        clickedBy: myRole,
        number: num,
        mistakes: updatedMistakes,
      });

      // 750ms reveal of wrong number & top red WRONG banner, then seamless sequence reset & turn switch
      wrongTimerRef.current = setTimeout(() => {
        wrongTimerRef.current = null;
        setState((prev) => {
          if (prev.phase !== 'playing') return prev;
          const nextTurnNumber = prev.turnNumber + 1;

          broadcastEvent({
            type: 'SWITCH_TURN',
            nextRole,
            turnNumber: nextTurnNumber,
          });

          return {
            ...prev,
            wrongNumber: null,
            isWrongEffect: false,
            activeRole: nextRole,
            targetNumber: 1,
            foundNumbers: [],
            turnNumber: nextTurnNumber,
          };
        });
      }, 750);
    },
    [broadcastEvent]
  );

  /** Rematch on same board */
  const rematchSameBoard = useCallback(() => {
    const current = stateRef.current;
    broadcastEvent({
      type: 'REMATCH_START',
      boardNumbers: current.boardNumbers,
      levelId: current.levelId,
    });
    handleRemoteEvent({
      type: 'REMATCH_START',
      boardNumbers: current.boardNumbers,
      levelId: current.levelId,
    });
  }, [broadcastEvent, handleRemoteEvent]);

  /** Rematch with a newly shuffled board */
  const rematchNewBoard = useCallback(() => {
    const current = stateRef.current;
    const newBoard = generateBoard(current.numberCount);
    broadcastEvent({
      type: 'REMATCH_START',
      boardNumbers: newBoard,
      levelId: current.levelId,
    });
    handleRemoteEvent({
      type: 'REMATCH_START',
      boardNumbers: newBoard,
      levelId: current.levelId,
    });
  }, [broadcastEvent, handleRemoteEvent]);

  /** Update player name locally */
  const setPlayerName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      localPlayer: {
        ...prev.localPlayer,
        name: name.trim() || (prev.role === 'host' ? 'Player 1' : 'Player 2'),
      },
    }));
  }, []);

  return {
    state,
    startGame,
    startPlaying,
    handleNumberClick,
    rematchSameBoard,
    rematchNewBoard,
    setPlayerName,
  };
}
