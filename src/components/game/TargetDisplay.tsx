interface TargetDisplayProps {
  target: number;
}

/**
 * TargetDisplay — shows the number the player must find next.
 * The number is intentionally very large for instant readability.
 */
export function TargetDisplay({ target }: TargetDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="label-tag">TARGET</span>
      <span
        className="num-display text-[var(--color-accent)]"
        style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', lineHeight: 1 }}
        aria-label={`Find number ${target}`}
        aria-live="assertive"
      >
        {target}
      </span>
    </div>
  );
}
