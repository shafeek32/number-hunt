import { useState, useRef, useCallback, useEffect } from 'react';
import type { DuelGameState } from '../types/multiplayer';
import { LEVELS, getLevelById } from '../data/levels';
import { generateBoard } from '../utils/randomizer';

export function createInitialDuelState(
  levelId: number = 8,
  p1Name: string = 'Player 1',
  p2Name: string = 'Player 2'
): DuelGameState {
  const level = getLevelById(levelId) ?? LEVELS[7]; // default Level 8 (12 numbers)
  return {
    phase: 'setup',
    level,
    numbers: generateBoard(level.numberCount),
    targetNumber: 1,
    foundNumbers: [],
    activePlayerId: 'p1',
    players: {
      p1: {
        id: 'p1',
        name: p1Name.trim() || 'Player 1',
        color: 'amber',
        mistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
        turnsTaken: 1,
      },
      p2: {
        id: 'p2',
        name: p2Name.trim() || 'Player 2',
        color: 'cyan',
        mistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
        turnsTaken: 0,
      },
    },
    winnerId: null,
    wrongNumber: null,
    isWrongEffect: false,
    turnNumber: 1,
  };
}

export function useDuelGame(initialLevelId: number = 8) {
  const [duelState, setDuelState] = useState<DuelGameState>(() =>
    createInitialDuelState(initialLevelId)
  );

  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(duelState);
  stateRef.current = duelState;

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) {
        clearTimeout(wrongTimerRef.current);
      }
    };
  }, []);

  /** Launch a duel from setup with chosen level (level 8 onwards) and player names */
  const startDuel = useCallback(
    (levelId: number = 8, p1Name?: string, p2Name?: string) => {
      if (wrongTimerRef.current) {
        clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = null;
      }
      const initial = createInitialDuelState(levelId, p1Name, p2Name);
      setDuelState({
        ...initial,
        phase: 'countdown',
      });
    },
    []
  );

  /** Start playing after 3-2-1 countdown finishes */
  const startPlaying = useCallback(() => {
    setDuelState((prev) => ({
      ...prev,
      phase: 'playing',
    }));
  }, []);

  /** Handle tile click during active player's turn */
  const handleNumberClick = useCallback((num: number) => {
    const current = stateRef.current;
    if (current.phase !== 'playing') return;
    if (current.isWrongEffect) return; // Ignore clicks during the brief red "WRONG!" feedback
    if (current.foundNumbers.includes(num)) return;

    const activeId = current.activePlayerId;
    const activePlayer = current.players[activeId];

    // 1. Correct number clicked!
    if (num === current.targetNumber) {
      const nextFound = [...current.foundNumbers, num];
      const nextStreak = activePlayer.currentStreak + 1;
      const nextBestStreak = Math.max(activePlayer.bestStreak, nextStreak);
      const isFinished = nextFound.length === current.level.numberCount;

      if (isFinished) {
        // Player found the last number — Game Won!
        setDuelState((prev) => ({
          ...prev,
          phase: 'finished',
          foundNumbers: nextFound,
          winnerId: activeId,
          players: {
            ...prev.players,
            [activeId]: {
              ...activePlayer,
              currentStreak: nextStreak,
              bestStreak: nextBestStreak,
            },
          },
        }));
        return;
      }

      // Advance target
      setDuelState((prev) => ({
        ...prev,
        foundNumbers: nextFound,
        targetNumber: prev.targetNumber + 1,
        players: {
          ...prev.players,
          [activeId]: {
            ...activePlayer,
            currentStreak: nextStreak,
            bestStreak: nextBestStreak,
          },
        },
      }));
      return;
    }

    // 2. Wrong number clicked!
    // Increment mistakes for active player, reset current streak.
    // NOTE: We DO NOT reveal the wrong number to players!
    const nextPlayerId: 'p1' | 'p2' = activeId === 'p1' ? 'p2' : 'p1';
    const nextPlayer = current.players[nextPlayerId];
    const updatedMistakes = activePlayer.mistakes + 1;

    setDuelState((prev) => ({
      ...prev,
      isWrongEffect: true,
      wrongNumber: null, // do not show wrong number on tile!
      players: {
        ...prev.players,
        [activeId]: {
          ...activePlayer,
          mistakes: updatedMistakes,
          currentStreak: 0,
        },
      },
    }));

    // Flash red WRONG effect at the top for 600ms, then seamlessly switch to next player
    wrongTimerRef.current = setTimeout(() => {
      wrongTimerRef.current = null;
      setDuelState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          isWrongEffect: false,
          activePlayerId: nextPlayerId,
          targetNumber: 1,
          foundNumbers: [], // tiles hide and sequence resets to 1
          turnNumber: prev.turnNumber + 1,
          players: {
            ...prev.players,
            [nextPlayerId]: {
              ...nextPlayer,
              turnsTaken: nextPlayer.turnsTaken + 1,
              currentStreak: 0,
            },
          },
        };
      });
    }, 600);
  }, []);

  /** Rematch using the exact same board layout */
  const rematchSameBoard = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    setDuelState((prev) => ({
      ...prev,
      phase: 'countdown',
      targetNumber: 1,
      foundNumbers: [],
      winnerId: null,
      wrongNumber: null,
      isWrongEffect: false,
      turnNumber: 1,
      activePlayerId: 'p1',
      players: {
        p1: {
          ...prev.players.p1,
          mistakes: 0,
          bestStreak: 0,
          currentStreak: 0,
          turnsTaken: 1,
        },
        p2: {
          ...prev.players.p2,
          mistakes: 0,
          bestStreak: 0,
          currentStreak: 0,
          turnsTaken: 0,
        },
      },
    }));
  }, []);

  /** Rematch with a fresh shuffled board */
  const rematchNewBoard = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    setDuelState((prev) => ({
      ...prev,
      phase: 'countdown',
      numbers: generateBoard(prev.level.numberCount),
      targetNumber: 1,
      foundNumbers: [],
      winnerId: null,
      wrongNumber: null,
      isWrongEffect: false,
      turnNumber: 1,
      activePlayerId: 'p1',
      players: {
        p1: {
          ...prev.players.p1,
          mistakes: 0,
          bestStreak: 0,
          currentStreak: 0,
          turnsTaken: 1,
        },
        p2: {
          ...prev.players.p2,
          mistakes: 0,
          bestStreak: 0,
          currentStreak: 0,
          turnsTaken: 0,
        },
      },
    }));
  }, []);

  /** Return to setup configuration */
  const resetToSetup = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    setDuelState((prev) => ({
      ...prev,
      phase: 'setup',
      targetNumber: 1,
      foundNumbers: [],
      winnerId: null,
      wrongNumber: null,
      isWrongEffect: false,
      turnNumber: 1,
    }));
  }, []);

  return {
    duelState,
    startDuel,
    startPlaying,
    handleNumberClick,
    rematchSameBoard,
    rematchNewBoard,
    resetToSetup,
  };
}
