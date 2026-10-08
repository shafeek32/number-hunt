import type { LeaderboardEntry } from '../../types/game';
import { formatTimeMs, formatScore } from '../../utils/scoring';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-[#f59e0b]',
  2: 'text-[#94a3b8]',
  3: 'text-[#cd7c3b]',
};

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3;
  const rankColor = RANK_COLORS[entry.rank] ?? 'text-[var(--color-text-muted)]';

  return (
    <tr
      className={[
        'border-b border-[var(--color-border)] transition-colors duration-100',
        entry.isCurrentPlayer
          ? 'bg-[var(--color-accent-light)]'
          : 'hover:bg-[var(--color-surface-2)]',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        entry.isCurrentPlayer
          ? `You — Rank ${entry.rank}`
          : `Rank ${entry.rank}: ${entry.playerName}`
      }
    >
      {/* Rank */}
      <td className={`py-3 pl-4 pr-2 font-black text-sm w-10 ${isTop3 ? rankColor : rankColor}`}>
        {entry.rank}
      </td>

      {/* Player */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {entry.avatarInitials}
          </div>
          <span
            className={[
              'font-semibold text-sm',
              entry.isCurrentPlayer
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {entry.playerName}
            {entry.isCurrentPlayer && (
              <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">you</span>
            )}
          </span>
        </div>
      </td>

      {/* Score */}
      <td className="py-3 pr-2 text-right">
        <span className="num-display text-sm font-bold text-[var(--color-text-primary)]">
          {formatScore(entry.score)}
        </span>
      </td>

      {/* Time */}
      <td className="py-3 pr-4 text-right">
        <span className="num-display text-sm text-[var(--color-text-secondary)]">
          {formatTimeMs(entry.timeMs)}
        </span>
      </td>
    </tr>
  );
}
