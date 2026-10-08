import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { GameBoard } from '../components/game/GameBoard';
import { NumberCard, type NumberCardState } from '../components/game/NumberCard';
import { Timer } from '../components/game/Timer';
import { TargetDisplay } from '../components/game/TargetDisplay';
import { ProgressBar } from '../components/game/ProgressBar';
import { Countdown } from '../components/game/Countdown';
import { LEVELS, getLevelById } from '../data/levels';
import { isLevelUnlocked } from '../utils/storage';
import { useGame } from '../hooks/useGame';

export function Game() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract game options from navigation state
  const locationState = location.state as {
    levelId?: number;
    isDaily?: boolean;
    challengeId?: string;
    seededBoard?: number[];
  } | null;

  const isDaily = locationState?.isDaily ?? false;
  const levelId = locationState?.levelId ?? (isDaily ? 8 : 1);

  // Validate unlocked status (daily challenge is open to all)
  useEffect(() => {
    if (!isDaily && !isLevelUnlocked(levelId)) {
      navigate('/levels', { replace: true });
    }
  }, [isDaily, levelId, navigate]);

  const level = getLevelById(levelId) ?? LEVELS[0];
  const {
    gameState,
    wrongNumber,
    gameResult,
    elapsedMs,
    startGame,
    startPlaying,
    handleNumberClick,
  } = useGame(level, {
    isDaily,
    challengeId: locationState?.challengeId,
    seededBoard: locationState?.seededBoard,
  });

  // Auto-start countdown on initial mount or level change
  useEffect(() => {
    startGame();
  }, [level.id, startGame]);

  // Navigate to Result screen once game finishes
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (gameState.phase === 'finished' && gameResult && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      const timer = setTimeout(() => {
        navigate('/result', { state: { result: gameResult } });
      }, 700);
      return () => clearTimeout(timer);
    }
    if (gameState.phase !== 'finished') {
      hasNavigatedRef.current = false;
    }
  }, [gameState.phase, gameResult, navigate]);

  const isCountdown = gameState.phase === 'countdown';
  const isPlaying = gameState.phase === 'playing';
  const isFinished = gameState.phase === 'finished';

  return (
    <PageContainer maxWidth="max-w-lg">
      {/* ── TOP UTILITY BAR ──────────────────── */}
      <div className="flex items-center justify-between mb-4 text-xs font-bold text-[var(--color-text-muted)]">
        <Link
          to={isDaily ? '/daily' : '/levels'}
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors"
          aria-label={isDaily ? 'Back to Daily Challenge' : 'Back to level selection'}
        >
          <span>←</span>
          <span>{isDaily ? 'DAILY CHALLENGE' : 'ALL LEVELS'}</span>
        </Link>
        <button
          onClick={startGame}
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          aria-label="Restart current level"
        >
          <span>↺</span>
          <span>RESTART</span>
        </button>
      </div>

      {/* ── GAME HEADER (STATS) ──────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label-tag">{isDaily ? 'CHALLENGE' : 'LEVEL'}</div>
          <div className="num-display text-2xl font-black text-[var(--color-text-primary)]">
            {isDaily ? 'DAILY' : level.id}
            {!isDaily && <span className="text-base text-[var(--color-text-muted)] font-bold"> / 16</span>}
          </div>
        </div>

        <Timer elapsedMs={elapsedMs} isRunning={isPlaying} prominent />

        <div className="text-right">
          <div className="label-tag">MISTAKES</div>
          <div
            className={[
              'num-display text-2xl font-black transition-all duration-200 inline-block',
              wrongNumber !== null
                ? 'text-[var(--color-error)] scale-125 animate-shake'
                : gameState.mistakes > 0
                ? 'text-[var(--color-error)]'
                : 'text-[var(--color-text-muted)]',
            ].join(' ')}
            aria-live="polite"
          >
            {gameState.mistakes}
          </div>
        </div>
      </div>

      {/* ── TARGET ───────────────────────────── */}
      <div className="flex justify-center mb-5">
        <TargetDisplay target={gameState.targetNumber} />
      </div>

      {/* ── BOARD CONTAINER (WITH COUNTDOWN OVERLAY) ── */}
      <div className="relative min-h-[280px] flex items-center justify-center">
        {/* Countdown Overlay */}
        {isCountdown && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg)]/85 backdrop-blur-xs rounded-2xl animate-fade-in">
            <Countdown from={3} onComplete={startPlaying} />
          </div>
        )}

        {/* Finished Overlay */}
        {isFinished && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-xs rounded-2xl animate-fade-in">
            <span className="text-4xl mb-2">🎉</span>
            <div className="num-display text-2xl font-black text-[var(--color-success)] tracking-wide">
              LEVEL COMPLETE!
            </div>
          </div>
        )}

        {/* Number Board */}
        <div
          className={[
            'w-full transition-all duration-300',
            isCountdown ? 'filter blur-sm opacity-40 pointer-events-none' : '',
          ].join(' ')}
        >
          <GameBoard rows={level.gridSize.rows} cols={level.gridSize.cols}>
            {gameState.numbers.map((num) => {
              const isFound = gameState.foundNumbers.includes(num);
              const isWrong = wrongNumber === num;
              const cardState: NumberCardState = isWrong
                ? 'wrong'
                : isFound
                ? 'found'
                : 'hidden';

              return (
                <NumberCard
                  key={num}
                  number={num}
                  state={cardState}
                  disabled={!isPlaying || wrongNumber !== null}
                  onClick={handleNumberClick}
                />
              );
            })}
          </GameBoard>
        </div>
      </div>

      {/* ── PROGRESS ─────────────────────────── */}
      <div className="mt-5">
        <ProgressBar
          found={gameState.foundNumbers.length}
          total={level.numberCount}
        />
      </div>

      {/* ── FOOTER HINT ──────────────────────── */}
      <div className="mt-6 text-center">
        <span className="text-xs text-[var(--color-text-muted)] font-medium">
          Cards are hidden! Find numbers in order: 1 → {level.numberCount}. Wrong taps reset sequence to 1.
        </span>
      </div>
    </PageContainer>
  );
}
