export type NumberCardState = 'hidden' | 'found' | 'wrong' | 'idle' | 'target';

interface NumberCardProps {
  number: number;
  state?: NumberCardState;
  onClick?: (num: number) => void;
  disabled?: boolean;
}

const stateClasses: Record<NumberCardState, string> = {
  hidden: 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)] hover:bg-[var(--color-surface-2)] active:scale-95 group shadow-xs',
  found:  'bg-[var(--color-success-light)] border-[var(--color-success)] text-[var(--color-success)] shadow-xs cursor-default',
  wrong:  'bg-[var(--color-error-light)] border-[var(--color-error)] text-[var(--color-error)] animate-card-wrong shadow-md cursor-default',
  idle:   'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)] active:scale-95',
  target: 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]',
};

/**
 * NumberCard — individual number tile on the game board.
 * In Number Hunt, cards start hidden (face down).
 * Tapping reveals numbers: correct ones stay found, wrong ones show briefly then hide.
 */
export function NumberCard({ number, state = 'hidden', onClick, disabled = false }: NumberCardProps) {
  const isClickable = !disabled && (state === 'hidden' || state === 'idle');

  const handleClick = () => {
    if (isClickable) {
      onClick?.(number);
    }
  };

  return (
    <button
      type="button"
      className={[
        'flex items-center justify-center w-full rounded-xl border-2',
        'transition-all duration-150 select-none relative',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
        stateClasses[state],
        isClickable ? 'cursor-pointer' : 'cursor-default',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        aspectRatio: '1 / 1',
        minHeight: '56px',
      }}
      onClick={handleClick}
      disabled={!isClickable}
      aria-label={
        state === 'hidden'
          ? 'Hidden tile'
          : state === 'found'
          ? `Number ${number}, found`
          : state === 'wrong'
          ? `Number ${number}, wrong`
          : `Number ${number}`
      }
      role="gridcell"
    >
      {state === 'hidden' && (
        <span
          className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)] group-hover:bg-[var(--color-accent)] group-hover:scale-125 transition-all duration-150"
          aria-hidden="true"
        />
      )}

      {state === 'found' && (
        <div className="flex flex-col items-center justify-center leading-none animate-card-flip">
          <span className="num-display font-black leading-none" style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
            {number}
          </span>
          <span className="text-[10px] font-bold text-[var(--color-success)] mt-0.5 leading-none">✓</span>
        </div>
      )}

      {state === 'wrong' && (
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="num-display font-black leading-none" style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
            {number}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-error)] mt-1 leading-none">
            Wrong
          </span>
        </div>
      )}

      {(state === 'idle' || state === 'target') && (
        <span className="num-display font-black leading-none" style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
          {number}
        </span>
      )}
    </button>
  );
}
