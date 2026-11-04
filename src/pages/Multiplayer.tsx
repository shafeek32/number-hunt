import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { GameBoard } from '../components/game/GameBoard';
import { NumberCard, type NumberCardState } from '../components/game/NumberCard';
import { TargetDisplay } from '../components/game/TargetDisplay';
import { Countdown } from '../components/game/Countdown';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { LEVELS, getLevelById } from '../data/levels';
import { useDuelGame } from '../hooks/useDuelGame';

// Filter levels from Level 8 onwards (Level 8 to Level 16)
const MULTIPLAYER_LEVELS = LEVELS.filter((l) => l.id >= 8);

export function Multiplayer() {
  const [selectedLevelId, setSelectedLevelId] = useState<number>(8);
  const [p1Name, setP1Name] = useState<string>('Player 1');
  const [p2Name, setP2Name] = useState<string>('Player 2');

  const {
    duelState,
    startDuel,
    startPlaying,
    handleNumberClick,
    rematchSameBoard,
    rematchNewBoard,
    resetToSetup,
  } = useDuelGame(selectedLevelId);

  const {
    phase,
    level,
    numbers,
    targetNumber,
    foundNumbers,
    activePlayerId,
    players,
    winnerId,
    isWrongEffect,
    turnNumber,
  } = duelState;

  const activePlayer = players[activePlayerId];
  const winner = winnerId ? players[winnerId] : null;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SETUP PHASE (LEVELS FROM LEVEL 8 ONWARDS)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const currentSelectedLevel = getLevelById(selectedLevelId) ?? MULTIPLAYER_LEVELS[0];

    return (
      <PageContainer maxWidth="max-w-md">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-4 text-xs font-bold text-[var(--color-text-muted)]">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors"
          >
            <span>←</span>
            <span>HOME</span>
          </Link>
          <span className="label-tag text-amber-500">2-PLAYER DUEL</span>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">⚔️</span>
          <h1 className="num-display text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            2-PLAYER DUEL
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 font-medium">
            Pass & Play on the same device. Open 1, 2, 3... if wrong, turn instantly passes to your opponent!
          </p>
        </div>

        {/* Players Configuration */}
        <Card className="mb-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <span className="label-tag">PLAYER NAMES</span>
              <span className="text-xs text-[var(--color-text-muted)]">Same device</span>
            </div>

            {/* Player 1 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p1-name" className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                PLAYER 1 (AMBER)
              </label>
              <input
                id="p1-name"
                type="text"
                maxLength={16}
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Player 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold text-sm focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Player 2 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p2-name" className="text-xs font-bold text-sky-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                PLAYER 2 (CYAN)
              </label>
              <input
                id="p2-name"
                type="text"
                maxLength={16}
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Player 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold text-sm focus:border-sky-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Level Selector (Levels 8 to 16) */}
        <Card className="mb-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <span className="label-tag">CHOOSE LEVEL (LEVEL 8 ONWARDS)</span>
              <span className="num-display text-sm font-bold text-[var(--color-accent)]">
                Level {currentSelectedLevel.id} · {currentSelectedLevel.numberCount} Numbers
              </span>
            </div>

            {/* Levels 8 to 16 Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MULTIPLAYER_LEVELS.map((lvl) => {
                const isSelected = selectedLevelId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={[
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer',
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)] font-black shadow-xs'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]',
                    ].join(' ')}
                  >
                    <span className="num-display text-base font-bold">Level {lvl.id}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{lvl.numberCount} numbers</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Rules Summary */}
        <Card className="mb-6 bg-[var(--color-surface-2)] border-dashed">
          <div className="flex flex-col gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 mb-1">
              <span>📜</span>
              <span>HOW IT WORKS</span>
            </span>
            <p>• Player 1 hunts numbers in ascending order: 1, 2, 3...</p>
            <p>• If a wrong tile is clicked, <strong>"WRONG" flashes in red at the top</strong>, all tiles hide, and the turn instantly passes to Player 2!</p>
            <p>• Wrong numbers are never revealed — only your memory and wits prevail!</p>
            <p>• The first player to reach the final number wins the duel! 🏆</p>
          </div>
        </Card>

        {/* Launch Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => startDuel(selectedLevelId, p1Name, p2Name)}
        >
          ⚔️ START 2-PLAYER DUEL
        </Button>
      </PageContainer>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. IN-GAME & VICTORY PHASES
  // ──────────────────────────────────────────────────────────────────────────
  const isCountdown = phase === 'countdown';
  const isPlaying = phase === 'playing';
  const isFinished = phase === 'finished';

  return (
    <PageContainer maxWidth="max-w-lg">
      {/* ── TOP UTILITY BAR ──────────────────── */}
      <div className="flex items-center justify-between mb-3 text-xs font-bold text-[var(--color-text-muted)]">
        <button
          onClick={resetToSetup}
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          aria-label="Exit duel and return to settings"
        >
          <span>←</span>
          <span>EXIT DUEL</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-mono text-xs">
            ROUND {turnNumber} · LEVEL {level.id}
          </span>
          <button
            onClick={rematchNewBoard}
            className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            aria-label="Restart with new board"
          >
            <span>↺</span>
            <span>RESTART</span>
          </button>
        </div>
      </div>

      {/* ── TOP RED WRONG FLASH OR ACTIVE PLAYER TURN BANNER ── */}
      {isWrongEffect ? (
        <div className="w-full bg-red-600/20 border-2 border-red-500 text-red-500 rounded-2xl py-3 px-4 text-center animate-shake shadow-lg shadow-red-500/25 mb-4">
          <div className="font-black text-2xl tracking-wider leading-none">
            ❌ WRONG!
          </div>
          <div className="text-xs font-bold text-red-400 mt-1">
            Sequence reset · Passing turn...
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mb-4">
          <div
            className={[
              'px-6 py-2 rounded-full text-sm font-black uppercase tracking-wider mb-2 transition-all duration-300 shadow-sm',
              activePlayerId === 'p1'
                ? 'bg-amber-500 text-white ring-4 ring-amber-500/25'
                : 'bg-sky-500 text-white ring-4 ring-sky-500/25',
            ].join(' ')}
          >
            🎯 {activePlayer.name}'S TURN
          </div>
          <TargetDisplay target={targetNumber} />
          <div className="text-xs font-bold text-[var(--color-text-muted)] mt-1">
            CURRENT STREAK:{' '}
            <span className="text-[var(--color-text-primary)] font-black">
              {activePlayer.currentStreak}
            </span>{' '}
            / {level.numberCount}
          </div>
        </div>
      )}

      {/* ── DUAL SCOREBOARD STRIP ────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Player 1 Card */}
        <div
          className={[
            'p-3 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden',
            activePlayerId === 'p1' && !isFinished
              ? 'border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-75',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black text-amber-500 tracking-wider truncate max-w-[120px]">
              {players.p1.name}
            </span>
            {activePlayerId === 'p1' && !isFinished && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-[var(--color-text-muted)] font-bold">
              BEST STREAK:{' '}
              <span className="font-black text-[var(--color-text-primary)]">
                {players.p1.bestStreak}
              </span>
            </div>
            <div className="text-xs text-red-500 font-bold">
              {players.p1.mistakes} ❌
            </div>
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className={[
            'p-3 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden',
            activePlayerId === 'p2' && !isFinished
              ? 'border-sky-500 bg-sky-500/10 shadow-md ring-2 ring-sky-500/30'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-75',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black text-sky-500 tracking-wider truncate max-w-[120px]">
              {players.p2.name}
            </span>
            {activePlayerId === 'p2' && !isFinished && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-sky-500 text-white animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-[var(--color-text-muted)] font-bold">
              BEST STREAK:{' '}
              <span className="font-black text-[var(--color-text-primary)]">
                {players.p2.bestStreak}
              </span>
            </div>
            <div className="text-xs text-red-500 font-bold">
              {players.p2.mistakes} ❌
            </div>
          </div>
        </div>
      </div>

      {/* ── BOARD CONTAINER WITH OVERLAYS ────── */}
      <div className="relative min-h-[280px] flex items-center justify-center">
        {/* Countdown Overlay */}
        {isCountdown && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-bg)]/90 backdrop-blur-xs rounded-2xl animate-fade-in p-6 text-center">
            <span className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">
              GET READY · {players.p1.name} STARTS
            </span>
            <Countdown from={3} onComplete={startPlaying} />
          </div>
        )}

        {/* Victory Celebration Modal Overlay */}
        {isFinished && winner && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--color-bg)]/95 backdrop-blur-md rounded-2xl animate-scale-in p-6 text-center shadow-2xl border-2 border-[var(--color-accent)]">
            <span className="text-5xl mb-2 animate-bounce">👑</span>
            <span className="label-tag text-emerald-500 mb-1">VICTORY!</span>
            <h2
              className={[
                'num-display text-3xl font-black mb-3 leading-none',
                winner.id === 'p1' ? 'text-amber-500' : 'text-sky-500',
              ].join(' ')}
            >
              {winner.name} WINS!
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              Successfully conquered all {level.numberCount} numbers in Round {turnNumber}!
            </p>

            {/* Duel Stats Comparison Card */}
            <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-6">
              <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] p-3 text-center">
                <div>
                  <div className="text-xs font-bold text-amber-500 truncate">{players.p1.name}</div>
                  <div className="text-lg font-black text-[var(--color-text-primary)] mt-1">
                    {players.p1.bestStreak}{' '}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">streak</span>
                  </div>
                  <div className="text-xs text-red-500 font-semibold mt-0.5">
                    {players.p1.mistakes} mistakes
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-sky-500 truncate">{players.p2.name}</div>
                  <div className="text-lg font-black text-[var(--color-text-primary)] mt-1">
                    {players.p2.bestStreak}{' '}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">streak</span>
                  </div>
                  <div className="text-xs text-red-500 font-semibold mt-0.5">
                    {players.p2.mistakes} mistakes
                  </div>
                </div>
              </div>
            </div>

            {/* Rematch Actions */}
            <div className="flex flex-col gap-2.5 w-full">
              <Button variant="primary" size="md" fullWidth onClick={rematchSameBoard}>
                ↺ REMATCH (Same Board)
              </Button>
              <Button variant="secondary" size="md" fullWidth onClick={rematchNewBoard}>
                🎲 REMATCH (New Board)
              </Button>
              <Button variant="ghost" size="sm" fullWidth onClick={resetToSetup}>
                ⚙️ Change Players or Level
              </Button>
            </div>
          </div>
        )}

        {/* Number Board */}
        <div
          className={[
            'w-full transition-all duration-300',
            isCountdown || isFinished
              ? 'filter blur-xs opacity-40 pointer-events-none'
              : '',
          ].join(' ')}
        >
          <GameBoard rows={level.gridSize.rows} cols={level.gridSize.cols}>
            {numbers.map((num) => {
              const isFound = foundNumbers.includes(num);
              // WRONG NUMBERS ARE NEVER REVEALED ON THE BOARD
              const cardState: NumberCardState = isFound ? 'found' : 'hidden';

              return (
                <NumberCard
                  key={num}
                  number={num}
                  state={cardState}
                  disabled={!isPlaying || isWrongEffect}
                  onClick={handleNumberClick}
                />
              );
            })}
          </GameBoard>
        </div>
      </div>
    </PageContainer>
  );
}
