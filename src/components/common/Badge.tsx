import type { ReactNode } from 'react';
import type { Difficulty } from '../../types/game';

type BadgeVariant = 'difficulty' | 'success' | 'error' | 'warning' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  difficulty?: Difficulty;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success:  'bg-[var(--color-success-light)] text-[var(--color-success)]',
  error:    'bg-[var(--color-error-light)] text-[var(--color-error)]',
  warning:  'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  neutral:  'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]',
  difficulty: '', // handled by difficulty prop
};

const difficultyClasses: Record<Difficulty, string> = {
  easy:       'badge-easy',
  normal:     'badge-normal',
  hard:       'badge-hard',
  'very-hard':'badge-very-hard',
  extreme:    'badge-extreme',
};

export function Badge({ children, variant = 'neutral', difficulty, className = '' }: BadgeProps) {
  const diffClass = difficulty ? difficultyClasses[difficulty] : '';
  const varClass  = variant !== 'difficulty' ? variantClasses[variant] : '';

  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5',
        'rounded-full text-xs font-bold tracking-wide uppercase',
        diffClass || varClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
