import { useEffect, useState, useRef } from 'react';

interface CountdownProps {
  from?: number;
  onComplete?: () => void;
}

/**
 * Countdown — shows 3…2…1…GO! before the game starts.
 * Uses a ref for onComplete to prevent interval restarts on parent re-renders.
 */
export function Countdown({ from = 3, onComplete }: CountdownProps) {
  const [count, setCount] = useState<number | 'GO!'>(from);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let current = from;
    setCount(from);

    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        setCount('GO!');
        clearInterval(interval);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 500);
      } else {
        setCount(current);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [from]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 animate-scale-in"
      aria-live="assertive"
      aria-label={`Countdown: ${count}`}
    >
      <span
        className="num-display font-black text-[var(--color-accent)] drop-shadow-md select-none"
        style={{ fontSize: 'clamp(5rem, 20vw, 8rem)', lineHeight: 1 }}
      >
        {count}
      </span>
      {count !== 'GO!' ? (
        <span className="label-tag text-[var(--color-text-muted)] tracking-widest text-sm font-bold">
          GET READY
        </span>
      ) : (
        <span className="label-tag text-[var(--color-success)] tracking-widest text-sm font-bold animate-pulse">
          HUNT!
        </span>
      )}
    </div>
  );
}
