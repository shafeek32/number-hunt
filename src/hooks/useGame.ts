/**
 * useGame — Core game state management hook for Number Hunt.
 * Handles board generation, countdown-to-play lifecycle,
 * ascending number validation, mistake tracking, timing,
 * and completion score computation.
 * Supports both standard Level mode and seeded Daily Challenge mode.
 *
 * Phase 4: Integrates local pre-validation and server-side score validation
 * via the validate-score Edge Function (with graceful fallback).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState, GameResult, Level } from '../types/game';
import { createInitialGameState, calcAccuracy } from '../utils/gameEngine';
import { calculateScore, calculateStars } from '../utils/scoring';
import { recordGameCompletion } from '../utils/storage';
import { gameService } from '../services/gameService';
import { validationService } from '../services/validationService';
import { dailyChallengeService } from '../services/dailyChallengeService';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import { useTimer } from './useTimer';

export interface UseGameOptions {
  isDaily?: boolean;
  challengeId?: string;
  seededBoard?: number[];
}

export interface UseGameReturn {
  gameState: GameState;
  wrongNumber: number | null;
  gameResult: GameResult | null;
  elapsedMs: number;
  startGame: () => void;
  startPlaying: () => void;
  resetGame: () => void;
  handleNumberClick: (num: number) => void;
}

export function useGame(level: Level, options?: UseGameOptions): UseGameReturn {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initial = createInitialGameState(level);
    if (options?.seededBoard && options.seededBoard.length > 0) {
      initial.numbers = options.seededBoard;
    }
    return initial;
  });
  const [wrongNumber, setWrongNumber] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const timer = useTimer();
  const { reset: resetTimer, start: startTimer, stop: stopTimer } = timer;
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Anti-replay token issued when game starts (Phase 4)
  const gameTokenRef = useRef<string | null>(null);

  // Keep latest level, options, and gameState in refs for stable callback access
  const levelRef = useRef(level);
  levelRef.current = level;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // If level or seeded board changes, reset game state
  useEffect(() => {
    resetTimer();
    setWrongNumber(null);
    setGameResult(null);
    const initial = createInitialGameState(level);
    if (options?.seededBoard && options.seededBoard.length > 0) {
      initial.numbers = options.seededBoard;
    }
    setGameState(initial);
  }, [level.id, options?.seededBoard, resetTimer]);

  // Clean up wrong number timer on unmount
  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) {
        clearTimeout(wrongTimerRef.current);
      }
    };
  }, []);

  /** Transition from idle to countdown */
  const startGame = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    resetTimer();
    setWrongNumber(null);
    setGameResult(null);
    gameTokenRef.current = null;
    const currentLevel = levelRef.current;
    const currentOptions = optionsRef.current;
    const initial = createInitialGameState(currentLevel);
    if (currentOptions?.seededBoard && currentOptions.seededBoard.length > 0) {
      initial.numbers = currentOptions.seededBoard;
    }
    setGameState({
      ...initial,
      phase: 'countdown',
    });
    // Phase 4: Issue anti-replay token (non-blocking)
    authService.getUser().then((currentUser) => {
      if (currentUser) {
        validationService.issueGameToken(currentUser.id, currentLevel.id).then((tok) => {
          gameTokenRef.current = tok;
        });
      }
    });
  }, [resetTimer]);

  /** Transition from countdown to active playing: start stopwatch */
  const startPlaying = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    resetTimer();
    startTimer();
    setGameState((prev) => ({
      ...prev,
      phase: 'playing',
      startTime: Date.now(),
      elapsedMs: 0,
    }));
  }, [resetTimer, startTimer]);

  /** Reset game back to idle with fresh board */
  const resetGame = useCallback(() => {
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    resetTimer();
    setWrongNumber(null);
    setGameResult(null);
    const currentLevel = levelRef.current;
    const currentOptions = optionsRef.current;
    const initial = createInitialGameState(currentLevel);
    if (currentOptions?.seededBoard && currentOptions.seededBoard.length > 0) {
      initial.numbers = currentOptions.seededBoard;
    }
    setGameState(initial);
  }, [resetTimer]);

  /** Handle tile click during gameplay */
  const handleNumberClick = useCallback(
    (num: number) => {
      // 1. If wrong card reveal is currently active, ignore further clicks
      if (wrongTimerRef.current !== null) return;

      const current = gameStateRef.current;
      if (current.phase !== 'playing') return;
      if (current.foundNumbers.includes(num)) return;

      // 2. Correct number clicked
      if (num === current.targetNumber) {
        const nextFound = [...current.foundNumbers, num];
        const isFinished = nextFound.length === current.level.numberCount;

        if (isFinished) {
          const finalTime = stopTimer();
          const accuracy = calcAccuracy(current.level.numberCount, current.mistakes);
          const score = calculateScore(finalTime, current.mistakes, current.level);
          const stars = calculateStars(current.mistakes, accuracy);

          // Always record in local storage first (offline-safe)
          const completion = recordGameCompletion({
            levelId: current.level.id,
            timeMs: finalTime,
            score,
            mistakes: current.mistakes,
            accuracy,
            stars,
          });

          const result: GameResult = {
            level: current.level,
            timeMs: finalTime,
            mistakes: current.mistakes,
            accuracy,
            score,
            stars,
            isPersonalBest: completion.isPersonalBest,
            isNewRecord: completion.isNewRecord,
            newlyUnlockedAchievements: completion.newlyUnlockedAchievements,
          };

          setGameResult(result);

          // Phase 4: Local pre-validation before any cloud submission
          const localCheck = validationService.validateLocally({
            level: current.level,
            timeMs: finalTime,
            mistakes: current.mistakes,
            accuracy,
            score,
            stars,
          });

          if (!localCheck.valid) {
            console.warn('[useGame] Local validation failed:', localCheck.reason);
          }

          // Non-blocking asynchronous cloud upload if authenticated
          authService.getUser().then(async (currentUser) => {
            if (currentUser && localCheck.valid) {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;

              let cloudSaved = false;

              if (accessToken) {
                const validationResult = await validationService.submitValidatedScore(
                  {
                    userId: currentUser.id,
                    levelId: current.level.id,
                    numberCount: current.level.numberCount,
                    timeMs: finalTime,
                    mistakes: current.mistakes,
                    accuracy,
                    score,
                    stars,
                    token: gameTokenRef.current ?? undefined,
                    completedAt: new Date().toISOString(),
                  },
                  accessToken
                );
                cloudSaved = validationResult.valid;
                if (!validationResult.valid) {
                  console.warn('[useGame] Server validation failed:', validationResult.reason);
                }
              }

              if (!cloudSaved) {
                gameService.saveGame({
                  userId: currentUser.id,
                  levelId: current.level.id,
                  numberCount: current.level.numberCount,
                  timeMs: finalTime,
                  mistakes: current.mistakes,
                  accuracy,
                  score,
                  stars,
                });
              }

              const currentOpts = optionsRef.current;
              if (currentOpts?.isDaily && currentOpts.challengeId) {
                dailyChallengeService.submitDailyScore({
                  challengeId: currentOpts.challengeId,
                  userId: currentUser.id,
                  timeMs: finalTime,
                  mistakes: current.mistakes,
                  accuracy,
                  score,
                });
              }
            }
          });

          setGameState((prev) => ({
            ...prev,
            phase: 'finished',
            foundNumbers: nextFound,
            elapsedMs: finalTime,
          }));
          return;
        }

        // Advance to next target
        setGameState((prev) => ({
          ...prev,
          foundNumbers: nextFound,
          targetNumber: prev.targetNumber + 1,
        }));
        return;
      }

      // 3. Wrong number clicked!
      // Immediately increment the mistakes counter in state
      setGameState((prev) => ({
        ...prev,
        mistakes: prev.mistakes + 1,
      }));

      // Immediately show the wrong card with "Wrong" indication
      setWrongNumber(num);

      // Start the 750ms timer to hide cards and reset sequence to 1
      // Board positions remain unchanged so the player learns the board
      wrongTimerRef.current = setTimeout(() => {
        wrongTimerRef.current = null;
        setWrongNumber(null);
        setGameState((prev) => {
          if (prev.phase !== 'playing') return prev;
          return {
            ...prev,
            targetNumber: 1,
            foundNumbers: [],
          };
        });
      }, 750);
    },
    [stopTimer]
  );

  return {
    gameState,
    wrongNumber,
    gameResult,
    elapsedMs: timer.elapsedMs,
    startGame,
    startPlaying,
    resetGame,
    handleNumberClick,
  };
}
