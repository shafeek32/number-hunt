import { formatTimeMs } from '../../utils/scoring';

interface TimerProps {
  elapsedMs: number;
  isRunning?: boolean;
  /** If true, shows the timer in a large prominent style */
  prominent?: boolean;
}

/**
 * Timer — displays elapsed time.
 * Phase 1: fed by the useTimer hook in real-time.
 */
export function Timer({ elapsedMs, isRunning = false, prominent = false }: TimerProps) {
  const display = formatTimeMs(elapsedMs);

  if (prominent) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="label-tag">TIME</span>
        <span
          className={[
            'num-display text-[var(--color-text-primary)]',
            isRunning ? 'text-[var(--color-accent)]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)' }}
          aria-live="polite"
          aria-label={`Timer: ${display}`}
        >
          {display}
        </span>
      </div>
    );
  }

  return (
    <span
      className="num-display text-xl text-[var(--color-text-primary)]"
      aria-live="polite"
      aria-label={`Timer: ${display}`}
    >
      {display}
    </span>
  );
}
