import { formatScore } from '../../utils/scoring';

interface ScoreDisplayProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function ScoreDisplay({ score, label = 'SCORE', size = 'md' }: ScoreDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="label-tag">{label}</span>
      <span
        className={`num-display text-[var(--color-text-primary)] ${sizeClasses[size]}`}
        aria-label={`${label}: ${formatScore(score)}`}
      >
        {formatScore(score)}
      </span>
    </div>
  );
}
