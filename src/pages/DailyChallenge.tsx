import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { getLevelById, LEVELS } from '../data/levels';
import { generateSeededBoard } from '../utils/randomizer';
import { formatTimeMs, formatScore } from '../utils/scoring';
import {
  dailyChallengeService,
  type DailyLeaderboardEntry,
} from '../services/dailyChallengeService';
import type { DailyChallengeRow, DailyChallengeScoreRow } from '../types/database';

export function DailyChallenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallengeRow | null>(null);
  const [userScore, setUserScore] = useState<DailyChallengeScoreRow | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      const ch = await dailyChallengeService.getTodayChallenge();
      if (isCancelled) return;
      setChallenge(ch);

      if (user) {
        const score = await dailyChallengeService.getUserDailyScore(ch.id, user.id);
        if (!isCancelled) setUserScore(score);
      }

      const board = await dailyChallengeService.getDailyLeaderboard(ch.id, user?.id);
      if (!isCancelled) {
        setLeaderboard(board);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const level = challenge ? getLevelById(challenge.level_id) ?? LEVELS[7] : LEVELS[7];
  const seededBoard = challenge ? generateSeededBoard(level.numberCount, challenge.seed) : [];

  const handlePlay = () => {
    if (!challenge) return;
    navigate('/game', {
      state: {
        levelId: challenge.level_id,
        isDaily: true,
        challengeId: challenge.id,
        seededBoard,
      },
    });
  };

  // Format challenge date
  const dateString = challenge?.challenge_date
    ? new Date(challenge.challenge_date + 'T00:00:00Z').toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : 'Today';

  const userRankEntry = leaderboard.find((e) => e.isCurrentUser);

  return (
    <PageContainer maxWidth="max-w-md">
      {/* ── HEADER ───────────────────────── */}
      <div className="text-center mb-6">
        <div className="text-3xl mb-1.5 animate-bounce">🔥</div>
        <h1 className="text-2xl font-black tracking-widest uppercase text-[var(--color-text-primary)]">
          Daily Challenge
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">
          {dateString} · Same board for every player worldwide
        </p>
      </div>

      {/* ── CHALLENGE CARD ───────────────── */}
      <Card padding="lg" className="mb-4 text-center shadow-sm">
        <div className="label-tag mb-1">TARGET BOARD</div>
        <div
          className="num-display font-black leading-none text-[var(--color-accent)] mb-1"
          style={{ fontSize: 'clamp(3rem, 15vw, 4.5rem)' }}
        >
          {level.numberCount}
        </div>
        <div className="label-tag mb-3">NUMBERS · LEVEL {level.id}</div>

        <div className="text-xs text-[var(--color-text-secondary)] font-medium">
          Deterministic seeded arrangement. Fast fingers win.
        </div>
      </Card>

      {/* ── USER'S RESULT OR INVITATION ──── */}
      {userScore ? (
        <Card padding="md" className="mb-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-tag text-emerald-800">YOUR DAILY RESULT</div>
              <div className="num-display text-2xl font-black text-emerald-950 mt-0.5">
                {formatTimeMs(userScore.time_ms)}
              </div>
              <div className="text-[0.7rem] text-emerald-700 font-bold mt-0.5">
                Score: {formatScore(userScore.score)} · {userScore.mistakes} mistakes
              </div>
            </div>
            {userRankEntry && (
              <div className="text-right">
                <div className="label-tag text-emerald-800">RANK</div>
                <div className="num-display text-3xl font-black text-emerald-900 mt-0.5">
                  #{userRankEntry.rank}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : !user ? (
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 mb-4 text-center text-xs text-[var(--color-text-secondary)]">
          Playing as Guest. <Link to="/login" className="text-[var(--color-accent)] font-bold hover:underline">Sign in</Link> to save your score to the official daily leaderboard.
        </div>
      ) : null}

      {/* ── CTA ──────────────────────────── */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        id="play-daily-btn"
        onClick={handlePlay}
        disabled={loading}
        className="mb-6 shadow-md"
      >
        {userScore ? '↺ REPLAY TODAY\'S CHALLENGE' : '🔥 PLAY TODAY\'S CHALLENGE'}
      </Button>

      {/* ── TODAY'S DAILY LEADERBOARD ────── */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label-tag">TODAY'S TOP HUNTERS</h2>
        <span className="text-[0.68rem] text-[var(--color-text-muted)] font-bold">
          {leaderboard.length} SUBMISSIONS
        </span>
      </div>

      <Card padding="none" className="overflow-hidden shadow-xs mb-6">
        {loading ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
            Loading today's leaderboard...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)] font-medium">
            No entries yet today. Be the first to solve it!
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={`${entry.userId}-${entry.rank}`}
                className={[
                  'p-3 flex items-center justify-between text-xs',
                  entry.isCurrentUser ? 'bg-[var(--color-accent-light)]' : 'hover:bg-[var(--color-surface-2)]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-sm w-5 text-center text-[var(--color-text-muted)]">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-[var(--color-surface-3)] flex items-center justify-center text-[0.65rem] font-black">
                    {entry.avatar}
                  </span>
                  <div>
                    <div className="font-bold text-[var(--color-text-primary)] flex items-center gap-1">
                      <span>{entry.displayName}</span>
                      {entry.isCurrentUser && (
                        <span className="text-[0.6rem] text-[var(--color-accent)] font-bold">YOU</span>
                      )}
                    </div>
                    <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                      @{entry.username}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="num-display font-black text-[var(--color-text-primary)]">
                    {formatTimeMs(entry.timeMs)}
                  </div>
                  <div className="text-[0.65rem] text-[var(--color-text-muted)] font-bold">
                    {formatScore(entry.score)} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
