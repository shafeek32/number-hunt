import type { LeaderboardEntry } from '../../types/game';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="card overflow-hidden" style={{ padding: 0 }}>
      <table className="w-full border-collapse" aria-label="Leaderboard">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <th className="py-2.5 pl-4 pr-2 text-left label-tag w-10">#</th>
            <th className="py-2.5 pr-4 text-left label-tag">PLAYER</th>
            <th className="py-2.5 pr-2 text-right label-tag">SCORE</th>
            <th className="py-2.5 pr-4 text-right label-tag">TIME</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.playerId} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
