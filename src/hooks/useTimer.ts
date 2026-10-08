/**
 * useTimer — Precision stopwatch timer hook.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseTimerReturn {
  elapsedMs: number;
  isRunning: boolean;
  start: () => void;
  stop: () => number;
  reset: () => void;
}

export function useTimer(): UseTimerReturn {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - startTimeRef.current));
      }
    }, 33);
  }, []);

  const stop = useCallback((): number => {
    let finalElapsed = accumulatedMsRef.current;
    if (startTimeRef.current !== null) {
      finalElapsed += Date.now() - startTimeRef.current;
      accumulatedMsRef.current = finalElapsed;
      startTimeRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setElapsedMs(finalElapsed);
    return finalElapsed;
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    accumulatedMsRef.current = 0;
    setIsRunning(false);
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { elapsedMs, isRunning, start, stop, reset };
}
