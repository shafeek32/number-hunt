import type { ReactNode } from 'react';

interface GameBoardProps {
  rows: number;
  cols: number;
  children: ReactNode;
}

/**
 * GameBoard — CSS Grid wrapper for number cards.
 * The grid adapts size responsively; gap shrinks on small screens.
 */
export function GameBoard({ rows, cols, children }: GameBoardProps) {
  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: 'clamp(6px, 2vw, 12px)',
      }}
      role="grid"
      aria-label="Number board"
    >
      {children}
    </div>
  );
}
