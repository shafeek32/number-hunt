import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LEVELS, getLevelById } from '../data/levels';
import { generateBoard } from '../utils/randomizer';
import type {
  OnlineRole,
  OnlineDuelState,
  OnlineDuelEvent,
  OnlineDuelPhase,
  OnlineSyncStatePayload,
} from '../types/onlineDuel';

function generateRandomClientId(): string {
  return 'nh-' + Math.random().toString(36).slice(2, 9);
}

export interface StoredDuelSession {
  clientId: string;
  role: OnlineRole;
  name: string;
  roomCode: string;
  phase: OnlineDuelPhase;
  levelId: number;
  numberCount: number;
  boardNumbers: number[];
  targetNumber: number;
  foundNumbers: number[];
  activeRole: OnlineRole;
  turnNumber: number;
  winnerRole: OnlineRole | null;
  localMistakes: number;
  localBestStreak: number;
  localCurrentStreak: number;
  remoteMistakes: number;
  remoteBestStreak: number;
  remoteCurrentStreak: number;
  remoteName?: string;
  updatedAt: number;
}

export function getSessionStorageKey(roomCode: string): string {
  return `nh_duel_session_${roomCode.trim().toUpperCase()}`;
}

export function loadStoredDuelSession(roomCode: string): StoredDuelSession | null {
  if (typeof window === 'undefined' || !window.sessionStorage || !roomCode) return null;
  try {
    const raw = sessionStorage.getItem(getSessionStorageKey(roomCode));
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDuelSession;
      if (
        parsed.roomCode === roomCode.trim().toUpperCase() &&
        Date.now() - parsed.updatedAt < 2 * 60 * 60 * 1000 // 2 hours validity
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load session from sessionStorage', err);
  }
  return null;
}

export function saveStoredDuelSession(session: StoredDuelSession): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !session.roomCode) return;
  try {
    sessionStorage.setItem(getSessionStorageKey(session.roomCode), JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to save session to sessionStorage', err);
  }
}

export function clearStoredDuelSession(roomCode: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !roomCode) return;
  try {
    sessionStorage.removeItem(getSessionStorageKey(roomCode));
  } catch {}
}

export function useOnlineDuel(
  roomCode: string,
  initialRole: OnlineRole,
  initialPlayerName: string = ''
) {
  const cleanRoomCode = roomCode.trim().toUpperCase();
  const storedSession = useRef<StoredDuelSession | null>(
    loadStoredDuelSession(cleanRoomCode)
  ).current;

  // Preserve player identity across page refreshes
  const localIdRef = useRef<string>(storedSession?.clientId || generateRandomClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultLevel = LEVELS.find((l) => l.id === 8) ?? LEVELS[7]; // Level 8 default

  const effectiveRole = storedSession?.role || initialRole;
  const effectiveName =
    initialPlayerName.trim() ||
    storedSession?.name ||
    (effectiveRole === 'host' ? 'Player 1 (Host)' : 'Player 2 (Guest)');

  const [state, setState] = useState<OnlineDuelState>(() => {
    // If active duel session was stored in sessionStorage, restore it immediately
    if (storedSession && storedSession.phase !== 'lobby') {
      const lvl = getLevelById(storedSession.levelId) ?? defaultLevel;
      return {
        roomCode: cleanRoomCode,
        role: effectiveRole,
        phase: storedSession.phase,
        levelId: storedSession.levelId,
        numberCount: storedSession.numberCount || lvl.numberCount,
        boardNumbers: storedSession.boardNumbers,
        targetNumber: storedSession.targetNumber,
        foundNumbers: storedSession.foundNumbers,
        activeRole: storedSession.activeRole,
        localPlayer: {
          id: localIdRef.current,
          name: effectiveName,
          role: effectiveRole,
          isReady: true,
          color: effectiveRole === 'host' ? 'amber' : 'cyan',
          mistakes: storedSession.localMistakes,
          bestStreak: storedSession.localBestStreak,
          currentStreak: storedSession.localCurrentStreak,
        },
        remotePlayer: storedSession.remoteName
          ? {
              id: 'restored-remote',
              name: storedSession.remoteName,
              role: effectiveRole === 'host' ? 'guest' : 'host',
              isReady: true,
              color: effectiveRole === 'host' ? 'cyan' : 'amber',
              mistakes: storedSession.remoteMistakes,
              bestStreak: storedSession.remoteBestStreak,
              currentStreak: storedSession.remoteCurrentStreak,
            }
          : null,
        wrongNumber: null,
        isWrongEffect: false,
        winnerRole: storedSession.winnerRole,
        turnNumber: storedSession.turnNumber,
        connectionStatus: isSupabaseConfigured ? 'connecting' : 'disconnected',
        errorMessage: isSupabaseConfigured
          ? null
          : 'Supabase credentials are not configured. Online multiplayer requires a live Supabase connection.',
      };
    }

    return {
      roomCode: cleanRoomCode,
      role: effectiveRole,
      phase: 'lobby',
      levelId: defaultLevel.id,
      numberCount: defaultLevel.numberCount,
      boardNumbers: generateBoard(defaultLevel.numberCount),
      targetNumber: 1,
      foundNumbers: [],
      activeRole: 'host',
      localPlayer: {
        id: localIdRef.current,
        name: effectiveName,
        role: effectiveRole,
        isReady: true,
        color: effectiveRole === 'host' ? 'amber' : 'cyan',
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
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist session to sessionStorage on state updates
  useEffect(() => {
    if (!roomCode) return;
    const code = roomCode.trim().toUpperCase();
    saveStoredDuelSession({
      clientId: localIdRef.current,
      role: state.role,
      name: state.localPlayer.name,
      roomCode: code,
      phase: state.phase,
      levelId: state.levelId,
      numberCount: state.numberCount,
      boardNumbers: state.boardNumbers,
      targetNumber: state.targetNumber,
      foundNumbers: state.foundNumbers,
      activeRole: state.activeRole,
      turnNumber: state.turnNumber,
      winnerRole: state.winnerRole,
      localMistakes: state.localPlayer.mistakes,
      localBestStreak: state.localPlayer.bestStreak,
      localCurrentStreak: state.localPlayer.currentStreak,
      remoteMistakes: state.remotePlayer?.mistakes ?? 0,
      remoteBestStreak: state.remotePlayer?.bestStreak ?? 0,
      remoteCurrentStreak: state.remotePlayer?.currentStreak ?? 0,
      remoteName: state.remotePlayer?.name,
      updatedAt: Date.now(),
    });
  }, [state, roomCode]);

  // Defensive sync when parameters change
  useEffect(() => {
    if (roomCode) {
      const clean = roomCode.trim().toUpperCase();
      setState((prev) => (prev.roomCode === clean ? prev : { ...prev, roomCode: clean }));
    }
  }, [roomCode]);

  useEffect(() => {
    if (initialRole && !storedSession?.role) {
      setState((prev) => {
        if (prev.role === initialRole && prev.localPlayer.role === initialRole) return prev;
        return {
          ...prev,
          role: initialRole,
          localPlayer: {
            ...prev.localPlayer,
            role: initialRole,
            color: initialRole === 'host' ? 'amber' : 'cyan',
          },
        };
      });
    }
  }, [initialRole, storedSession]);

  useEffect(() => {
    if (initialPlayerName && initialPlayerName.trim()) {
      const cleanName = initialPlayerName.trim();
      setState((prev) => {
        if (prev.localPlayer.name === cleanName) return prev;
        return {
          ...prev,
          localPlayer: {
            ...prev.localPlayer,
            name: cleanName,
          },
        };
      });
    }
  }, [initialPlayerName]);

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

  // Helper to create sync payload
  const createSyncPayload = useCallback((): OnlineSyncStatePayload => {
    const cur = stateRef.current;
    return {
      phase: cur.phase,
      levelId: cur.levelId,
      numberCount: cur.numberCount,
      boardNumbers: cur.boardNumbers,
      targetNumber: cur.targetNumber,
      foundNumbers: cur.foundNumbers,
      activeRole: cur.activeRole,
      turnNumber: cur.turnNumber,
      winnerRole: cur.winnerRole,
      hostScore: {
        mistakes:
          cur.role === 'host'
            ? cur.localPlayer.mistakes
            : cur.remotePlayer?.mistakes ?? 0,
        bestStreak:
          cur.role === 'host'
            ? cur.localPlayer.bestStreak
            : cur.remotePlayer?.bestStreak ?? 0,
        currentStreak:
          cur.role === 'host'
            ? cur.localPlayer.currentStreak
            : cur.remotePlayer?.currentStreak ?? 0,
      },
      guestScore: {
        mistakes:
          cur.role === 'guest'
            ? cur.localPlayer.mistakes
            : cur.remotePlayer?.mistakes ?? 0,
        bestStreak:
          cur.role === 'guest'
            ? cur.localPlayer.bestStreak
            : cur.remotePlayer?.bestStreak ?? 0,
        currentStreak:
          cur.role === 'guest'
            ? cur.localPlayer.currentStreak
            : cur.remotePlayer?.currentStreak ?? 0,
      },
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // SUPABASE REALTIME CHANNEL LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !roomCode) {
      return;
    }

    const clean = roomCode.trim().toUpperCase();
    const channelName = `duel-room:${clean}`;

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

    // 2. Listen for Presence Changes (Opponent Joined / Left / Reconnected)
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
        // Clear disconnect grace timer if it was pending
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }

        setState((prev) => {
          const opponentRole: OnlineRole = prev.role === 'host' ? 'guest' : 'host';
          return {
            ...prev,
            remotePlayer: {
              id: opponent.id,
              name:
                opponent.name ||
                prev.remotePlayer?.name ||
                (opponentRole === 'host' ? 'Player 1 (Host)' : 'Player 2 (Guest)'),
              role: opponentRole,
              isReady: true,
              color: opponentRole === 'host' ? 'amber' : 'cyan',
              mistakes: prev.remotePlayer?.mistakes ?? 0,
              bestStreak: prev.remotePlayer?.bestStreak ?? 0,
              currentStreak: prev.remotePlayer?.currentStreak ?? 0,
            },
          };
        });

        // Greet opponent by broadcasting our player info so they have our name instantly
        broadcastEvent({
          type: 'PLAYER_JOIN',
          player: stateRef.current.localPlayer,
        });

        // If an active duel or finished match is running, synchronize state to the peer
        const cur = stateRef.current;
        if (
          cur.phase === 'playing' ||
          cur.phase === 'countdown' ||
          cur.phase === 'finished'
        ) {
          broadcastEvent({
            type: 'SYNC_STATE',
            syncState: createSyncPayload(),
          });
        }
      } else {
        // Opponent temporarily not in presence (e.g. refreshing page)
        // Give a 4-second grace period before clearing remotePlayer so refresh doesn't flash or drop
        if (!disconnectTimerRef.current && stateRef.current.remotePlayer) {
          disconnectTimerRef.current = setTimeout(() => {
            disconnectTimerRef.current = null;
            setState((prev) => (prev.remotePlayer ? { ...prev, remotePlayer: null } : prev));
          }, 4000);
        }
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

        // Request state synchronization from opponent in case a duel was active
        broadcastEvent({
          type: 'REQUEST_SYNC',
          fromId: localIdRef.current,
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
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (wrongTimerRef.current) {
        clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = null;
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, broadcastEvent, createSyncPayload]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLE INCOMING REMOTE EVENTS
  // ──────────────────────────────────────────────────────────────────────────
  const handleRemoteEvent = useCallback(
    (event: OnlineDuelEvent) => {
      switch (event.type) {
        case 'PLAYER_JOIN': {
          if (event.player.id !== localIdRef.current) {
            setState((prev) => ({
              ...prev,
              remotePlayer: {
                ...event.player,
                mistakes: prev.remotePlayer?.mistakes ?? event.player.mistakes,
                bestStreak: prev.remotePlayer?.bestStreak ?? event.player.bestStreak,
                currentStreak:
                  prev.remotePlayer?.currentStreak ?? event.player.currentStreak,
              },
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

        case 'REQUEST_SYNC': {
          const cur = stateRef.current;
          if (
            event.fromId !== localIdRef.current &&
            (cur.phase === 'playing' ||
              cur.phase === 'countdown' ||
              cur.phase === 'finished')
          ) {
            broadcastEvent({
              type: 'SYNC_STATE',
              syncState: createSyncPayload(),
            });
          }
          break;
        }

        case 'SYNC_STATE': {
          const { syncState } = event;
          setState((prev) => {
            const isHost = prev.role === 'host';
            const myScore = isHost ? syncState.hostScore : syncState.guestScore;
            const theirScore = isHost ? syncState.guestScore : syncState.hostScore;

            return {
              ...prev,
              phase: syncState.phase,
              levelId: syncState.levelId,
              numberCount: syncState.numberCount,
              boardNumbers: syncState.boardNumbers,
              targetNumber: syncState.targetNumber,
              foundNumbers: syncState.foundNumbers,
              activeRole: syncState.activeRole,
              turnNumber: syncState.turnNumber,
              winnerRole: syncState.winnerRole,
              localPlayer: {
                ...prev.localPlayer,
                mistakes: myScore.mistakes,
                bestStreak: myScore.bestStreak,
                currentStreak: myScore.currentStreak,
              },
              remotePlayer: prev.remotePlayer
                ? {
                    ...prev.remotePlayer,
                    mistakes: theirScore.mistakes,
                    bestStreak: theirScore.bestStreak,
                    currentStreak: theirScore.currentStreak,
                  }
                : null,
            };
          });
          break;
        }
      }
    },
    [defaultLevel, broadcastEvent, createSyncPayload]
  );

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

  /** Update player name locally and sync with channel */
  const setPlayerName = useCallback(
    (name: string) => {
      const cleanName =
        name.trim() || (stateRef.current.role === 'host' ? 'Player 1' : 'Player 2');
      const updatedLocalPlayer = {
        ...stateRef.current.localPlayer,
        name: cleanName,
      };

      setState((prev) => ({
        ...prev,
        localPlayer: updatedLocalPlayer,
      }));

      // Broadcast update to opponent
      broadcastEvent({
        type: 'PLAYER_JOIN',
        player: updatedLocalPlayer,
      });

      // Update Presence state in Supabase channel
      if (channelRef.current) {
        channelRef.current.track({
          id: localIdRef.current,
          name: cleanName,
          role: stateRef.current.role,
          joinedAt: new Date().toISOString(),
        });
      }
    },
    [broadcastEvent]
  );

  /** Explicitly leave the room and clear session */
  const leaveRoom = useCallback(() => {
    broadcastEvent({
      type: 'PLAYER_LEFT',
      role: stateRef.current.role,
    });
    clearStoredDuelSession(roomCode);
  }, [broadcastEvent, roomCode]);

  return {
    state,
    startGame,
    startPlaying,
    handleNumberClick,
    rematchSameBoard,
    rematchNewBoard,
    setPlayerName,
    leaveRoom,
  };
}
