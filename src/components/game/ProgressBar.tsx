interface ProgressBarProps {
  found: number;
  total: number;
}

/**
 * ProgressBar — shows how many numbers have been found out of total.
 */
export function ProgressBar({ found, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="label-tag">PROGRESS</span>
        <span className="text-xs font-bold text-[var(--color-text-secondary)]">
          {found} / {total}
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden"
        role="progressbar"
        aria-valuenow={found}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progress: ${found} of ${total} numbers found`}
      >
        <div
          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
