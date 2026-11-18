import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { GameBoard } from '../components/game/GameBoard';
import { NumberCard, type NumberCardState } from '../components/game/NumberCard';
import { TargetDisplay } from '../components/game/TargetDisplay';
import { Countdown } from '../components/game/Countdown';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { LEVELS, getLevelById } from '../data/levels';
import {
  useOnlineDuel,
  clearStoredDuelSession,
  loadStoredDuelSession,
} from '../hooks/useOnlineDuel';
import { isSupabaseConfigured } from '../lib/supabase';
import type { OnlineRole } from '../types/onlineDuel';

const MULTIPLAYER_LEVELS = LEVELS.filter((l) => l.id >= 8);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, using fallback', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ONLINE LOBBY (When on /online without a room code)
// ─────────────────────────────────────────────────────────────────────────────
function OnlineLobby() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<number>(8);

  const handleCreateRoom = () => {
    const newCode = generateRoomCode();
    const name = playerName.trim() || 'Player 1';
    clearStoredDuelSession(newCode);
    navigate(
      `/online/${newCode}?role=host&name=${encodeURIComponent(name)}&level=${selectedLevelId}`
    );
  };

  const handleJoinRoom = () => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    const name = playerName.trim() || 'Player 2';
    clearStoredDuelSession(clean);
    navigate(`/online/${clean}?role=guest&name=${encodeURIComponent(name)}`);
  };

  return (
    <PageContainer maxWidth="max-w-md">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 text-xs font-bold text-[var(--color-text-muted)]">
        <Link
          to="/multiplayer"
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors"
        >
          <span>←</span>
          <span>PASS & PLAY</span>
        </Link>
        <span className="label-tag text-emerald-500">REALTIME WEBSOCKET</span>
      </div>

      {/* Title */}
      <div className="text-center mb-5">
        <span className="text-4xl block mb-2">🌐</span>
        <h1 className="num-display text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
          ONLINE DUEL
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 font-medium">
          Play live with a friend anywhere in the world! Create a room, share the link, and race in real-time.
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] mb-5 text-xs font-bold">
        <Link
          to="/multiplayer"
          className="py-2 text-center rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          📱 Pass & Play (Local)
        </Link>
        <div className="py-2 text-center rounded-xl bg-[var(--color-surface)] text-[var(--color-accent)] shadow-xs flex items-center justify-center gap-1.5">
          <span>🌐 Online Duel</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 rounded-full font-black">
            LIVE
          </span>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="p-4 mb-4 rounded-xl bg-amber-500/10 border border-amber-500 text-amber-500 text-xs font-semibold">
          ⚠️ Supabase credentials are required for live WebSocket multiplayer.
        </div>
      )}

      {/* Player Name */}
      <Card className="mb-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="online-name"
            className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider"
          >
            YOUR DISPLAY NAME
          </label>
          <input
            id="online-name"
            type="text"
            maxLength={16}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateRoom();
            }}
            placeholder="e.g. SpeedMaster"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
          />
        </div>
      </Card>

      {/* Create Room */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3">
          <span className="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
            <span>🏠</span>
            <span>CREATE A ROOM</span>
          </span>
          <p className="text-xs text-[var(--color-text-muted)]">
            Choose your starting level and invite a friend with a room code.
          </p>

          {/* Level selection */}
          <div>
            <span className="label-tag mb-1.5 block">SELECT LEVEL (LEVEL 8 ONWARDS)</span>
            <div className="grid grid-cols-3 gap-2">
              {MULTIPLAYER_LEVELS.slice(0, 6).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevelId(lvl.id)}
                  className={[
                    'p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    selectedLevelId === lvl.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
                  ].join(' ')}
                >
                  Level {lvl.id}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={handleCreateRoom}>
            CREATE ROOM & GET LINK
          </Button>
        </div>
      </Card>

      {/* Join Room */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3">
          <span className="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
            <span>🔑</span>
            <span>JOIN WITH CODE</span>
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinRoom();
              }}
              placeholder="ROOM CODE"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono font-black text-center tracking-widest text-base focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleJoinRoom}
              disabled={!inputCode.trim()}
            >
              JOIN
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ONLINE ROOM (Lobby, Active Game & Victory Arena)
// ─────────────────────────────────────────────────────────────────────────────
interface OnlineRoomProps {
  roomCode: string;
}

function OnlineRoom({ roomCode }: OnlineRoomProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedSession = loadStoredDuelSession(roomCode);
  const explicitRole =
    (searchParams.get('role') as OnlineRole) || storedSession?.role || 'guest';
  const initialName = searchParams.get('name') || storedSession?.name || '';
  const initialLevel =
    Number(searchParams.get('level')) || storedSession?.levelId || 8;

  const [selectedLevelId, setSelectedLevelId] = useState<number>(initialLevel);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editNameInput, setEditNameInput] = useState<string>('');

  const {
    state,
    startGame,
    startPlaying,
    handleNumberClick,
    rematchSameBoard,
    rematchNewBoard,
    setPlayerName,
    leaveRoom,
    retryConnection,
  } = useOnlineDuel(roomCode, explicitRole, initialName);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/online');
  };

  const {
    phase,
    levelId,
    numberCount,
    boardNumbers,
    targetNumber,
    foundNumbers,
    activeRole,
    localPlayer,
    remotePlayer,
    wrongNumber,
    isWrongEffect,
    winnerRole,
    turnNumber,
    connectionStatus,
    errorMessage,
    isOpponentLeft,
    opponentLeftMessage,
  } = state;

  // When opponent leaves, cleanly exit back to /online
  useEffect(() => {
    if (isOpponentLeft) {
      const exitTimer = setTimeout(() => {
        clearStoredDuelSession(roomCode);
        navigate('/online');
      }, 3000);
      return () => clearTimeout(exitTimer);
    }
  }, [isOpponentLeft, navigate, roomCode]);

  const currentLevel = getLevelById(levelId) ?? MULTIPLAYER_LEVELS[0];
  const isMyTurn = localPlayer.role === activeRole;
  const activePlayerName = isMyTurn ? localPlayer.name : remotePlayer?.name || 'Opponent';
  const winner = winnerRole
    ? winnerRole === localPlayer.role
      ? localPlayer
      : remotePlayer
    : null;
  const isWinnerMe = winnerRole === localPlayer.role;

  // Invite URL guaranteed to include the roomCode
  const inviteUrl = `${window.location.origin}/online/${roomCode}?role=guest`;

  const handleCopyInviteLink = async () => {
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(roomCode);
    if (ok) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  const handleSaveName = () => {
    if (editNameInput.trim()) {
      setPlayerName(editNameInput.trim());
    }
    setIsEditingName(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // IN-ROOM LOBBY (WAITING FOR OPPONENT)
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    const isHost = localPlayer.role === 'host';
    const isOpponentReady = Boolean(remotePlayer);

    return (
      <PageContainer maxWidth="max-w-md">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4 text-xs font-bold text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>LEAVE ROOM</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span
              className={[
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500',
              ].join(' ')}
            />
            <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
              {connectionStatus}
            </span>
          </div>
        </div>

        {/* Room Code Banner */}
        <Card className="mb-5 text-center p-5 relative overflow-hidden">
          <div className="label-tag text-[var(--color-text-muted)] mb-1">ROOM CODE</div>
          <div className="num-display text-4xl sm:text-5xl font-black text-[var(--color-accent)] tracking-widest my-2 select-all">
            {roomCode}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyInviteLink}
              className="gap-1.5 shadow-sm justify-center py-2.5 sm:py-1.5 text-xs font-bold"
            >
              {linkCopied ? '✓ INVITE LINK COPIED!' : '📋 COPY INVITE LINK'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              className="gap-1.5 justify-center py-2.5 sm:py-1.5 text-xs font-bold"
            >
              {codeCopied ? '✓ CODE COPIED!' : '🏷️ COPY CODE'}
            </Button>
          </div>

          {/* Quick link display */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-muted)] font-mono break-all bg-[var(--color-surface-2)]/50 p-2 rounded-lg select-all">
            {inviteUrl}
          </div>
        </Card>

        {/* Players in Room */}
        <Card className="mb-5">
          <div className="flex flex-col gap-3">
            <span className="label-tag border-b border-[var(--color-border)] pb-2">
              PLAYERS IN ROOM
            </span>

            {/* Local Player */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex-shrink-0" />
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={16}
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        placeholder={localPlayer.name}
                        className="px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold w-28 focus:outline-none focus:border-[var(--color-accent)]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className="px-2 py-0.5 rounded bg-[var(--color-accent)] text-white text-[10px] font-bold"
                      >
                        SAVE
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">
                        {localPlayer.name}
                      </span>
                      <span className="text-xs text-amber-500 font-semibold">
                        ({localPlayer.role.toUpperCase()})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameInput(localPlayer.name);
                          setIsEditingName(true);
                        }}
                        className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] underline ml-1 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    You
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-500">✓ READY</span>
            </div>

            {/* Remote Opponent */}
            {remotePlayer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 animate-scale-in">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--color-text-primary)]">
                      {remotePlayer.name}{' '}
                      <span className="text-xs text-sky-500 font-semibold">
                        ({remotePlayer.role.toUpperCase()})
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                      Opponent
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500">✓ CONNECTED</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-[var(--color-border)] text-center">
                <span className="text-2xl mb-1.5 animate-pulse">⏳</span>
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Waiting for Player 2 to join...
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Share code <strong className="text-[var(--color-accent)]">{roomCode}</strong> or copy the invite link above!
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Start Game Controls */}
        {isHost ? (
          <div className="flex flex-col gap-3">
            <Card>
              <div className="flex flex-col gap-2">
                <span className="label-tag">MATCH LEVEL (LEVEL 8 ONWARDS)</span>
                <div className="grid grid-cols-3 gap-2">
                  {MULTIPLAYER_LEVELS.slice(0, 6).map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevelId(lvl.id)}
                      className={[
                        'p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        selectedLevelId === lvl.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
                      ].join(' ')}
                    >
                      Level {lvl.id}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isOpponentReady}
              onClick={() => startGame(selectedLevelId)}
            >
              {isOpponentReady ? '⚔️ START ONLINE DUEL' : 'WAITING FOR OPPONENT...'}
            </Button>
          </div>
        ) : (
          <Card className="text-center p-4">
            <span className="text-sm font-bold text-[var(--color-text-secondary)] block">
              Connected to Room {roomCode}!
            </span>
            <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
              Waiting for Host ({remotePlayer?.name || 'Player 1'}) to start match...
            </span>
          </Card>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <span className="font-semibold block text-red-300">{errorMessage}</span>
                {connectionStatus === 'error' && (
                  <span className="text-[11px] text-red-400/80 block mt-0.5">
                    Click retry below or check your network connection.
                  </span>
                )}
                {connectionStatus === 'connecting' && (
                  <span className="text-[11px] text-amber-400/80 block mt-0.5 animate-pulse">
                    Attempting to establish WebSocket channel...
                  </span>
                )}
              </div>
            </div>
            {connectionStatus === 'error' && (
              <button
                type="button"
                onClick={retryConnection}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 self-end sm:self-center"
              >
                🔄 Retry Connection
              </button>
            )}
          </div>
        )}

        {/* Opponent Left Modal / Auto-Exit Notice */}
        {isOpponentLeft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <Card className="max-w-sm w-full text-center p-6 border-red-500/50 shadow-2xl">
              <span className="text-4xl block mb-3 animate-bounce">🚪</span>
              <h2 className="text-xl font-black text-white mb-2">
                Opponent Left the Room
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                {opponentLeftMessage || 'Your opponent has exited the room. Returning to lobby...'}
              </p>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  clearStoredDuelSession(roomCode);
                  navigate('/online');
                }}
              >
                RETURN TO LOBBY NOW →
              </Button>
            </Card>
          </div>
        )}
      </PageContainer>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // IN-GAME & VICTORY ARENA
  // ──────────────────────────────────────────────────────────────────────────
  const isCountdown = phase === 'countdown';
  const isFinished = phase === 'finished';

  return (
    <PageContainer maxWidth="max-w-lg">
      {/* Utility Bar */}
      <div className="flex items-center justify-between mb-3 text-xs font-bold text-[var(--color-text-muted)]">
        <button
          type="button"
          onClick={handleLeaveRoom}
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>LEAVE ROOM</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-mono text-xs">
            ROOM {roomCode} · ROUND {turnNumber} · LEVEL {currentLevel.id}
          </span>
          {connectionStatus === 'connected' ? (
            <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          ) : connectionStatus === 'connecting' ? (
            <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              RECONNECTING...
            </span>
          ) : (
            <button
              type="button"
              onClick={retryConnection}
              className="text-xs font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Click to retry connection"
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              RETRY CONNECT
            </button>
          )}
        </div>
      </div>

      {/* In-Game Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          {connectionStatus === 'error' && (
            <button
              type="button"
              onClick={retryConnection}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded uppercase transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Top Banner: Red WRONG Flash or Turn Indicator */}
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
              isMyTurn
                ? localPlayer.role === 'host'
                  ? 'bg-amber-500 text-white ring-4 ring-amber-500/25 animate-pulse'
                  : 'bg-sky-500 text-white ring-4 ring-sky-500/25 animate-pulse'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
            ].join(' ')}
          >
            {isMyTurn ? '👉 YOUR TURN!' : `⏳ OPPONENT'S TURN (${activePlayerName})`}
          </div>

          <TargetDisplay target={targetNumber} />
          <div className="text-xs font-bold text-[var(--color-text-muted)] mt-1">
            STREAK:{' '}
            <span className="text-[var(--color-text-primary)] font-black">
              {isMyTurn ? localPlayer.currentStreak : remotePlayer?.currentStreak || 0}
            </span>{' '}
            / {numberCount}
          </div>
        </div>
      )}

      {/* Dual Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4">
        {/* Host Card */}
        <div
          className={[
            'p-3 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden',
            activeRole === 'host' && !isFinished
              ? 'border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-75',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-xs font-black text-amber-500 tracking-wider truncate flex-1 min-w-0">
              {localPlayer.role === 'host' ? localPlayer.name : remotePlayer?.name || 'Host'}
            </span>
            {activeRole === 'host' && !isFinished && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse shrink-0">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <div className="text-[var(--color-text-muted)] font-bold">
              BEST:{' '}
              <span className="font-black text-[var(--color-text-primary)]">
                {localPlayer.role === 'host'
                  ? localPlayer.bestStreak
                  : remotePlayer?.bestStreak || 0}
              </span>
            </div>
            <div className="text-red-500 font-bold">
              {localPlayer.role === 'host'
                ? localPlayer.mistakes
                : remotePlayer?.mistakes || 0}{' '}
              ❌
            </div>
          </div>
        </div>

        {/* Guest Card */}
        <div
          className={[
            'p-3 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden',
            activeRole === 'guest' && !isFinished
              ? 'border-sky-500 bg-sky-500/10 shadow-md ring-2 ring-sky-500/30'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-75',
          ].join(' ')}
        >
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-xs font-black text-sky-500 tracking-wider truncate flex-1 min-w-0">
              {localPlayer.role === 'guest' ? localPlayer.name : remotePlayer?.name || 'Guest'}
            </span>
            {activeRole === 'guest' && !isFinished && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-sky-500 text-white animate-pulse shrink-0">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <div className="text-[var(--color-text-muted)] font-bold">
              BEST:{' '}
              <span className="font-black text-[var(--color-text-primary)]">
                {localPlayer.role === 'guest'
                  ? localPlayer.bestStreak
                  : remotePlayer?.bestStreak || 0}
              </span>
            </div>
            <div className="text-red-500 font-bold">
              {localPlayer.role === 'guest'
                ? localPlayer.mistakes
                : remotePlayer?.mistakes || 0}{' '}
              ❌
            </div>
          </div>
        </div>
      </div>

      {/* Board & Overlays */}
      <div className="relative min-h-[280px] flex items-center justify-center">
        {/* Countdown Overlay */}
        {isCountdown && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-bg)]/90 backdrop-blur-xs rounded-2xl animate-fade-in p-6 text-center">
            <span className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">
              DUEL STARTING · HOST STARTS FIRST
            </span>
            <Countdown from={3} onComplete={startPlaying} />
          </div>
        )}

        {/* Victory Screen */}
        {isFinished && winner && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--color-bg)]/95 backdrop-blur-md rounded-2xl animate-scale-in p-6 text-center shadow-2xl border-2 border-[var(--color-accent)]">
            <span className="text-5xl mb-2 animate-bounce">👑</span>
            <span className="label-tag text-emerald-500 mb-1">
              {isWinnerMe ? '🎉 VICTORY! YOU WON!' : 'MATCH FINISHED'}
            </span>
            <h2 className="num-display text-3xl font-black mb-3 leading-none text-[var(--color-accent)]">
              {winner.name} WINS!
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              Conquered all {numberCount} numbers in Round {turnNumber}!
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <Button variant="primary" size="md" fullWidth onClick={rematchSameBoard}>
                ↺ REMATCH (Same Board)
              </Button>
              <Button variant="secondary" size="md" fullWidth onClick={rematchNewBoard}>
                🎲 REMATCH (New Board)
              </Button>
              <Button variant="ghost" size="sm" fullWidth onClick={handleLeaveRoom}>
                ← Back to Online Lobby
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Board */}
        <div
          className={[
            'w-full transition-all duration-300',
            isCountdown || isFinished ? 'filter blur-xs opacity-40 pointer-events-none' : '',
          ].join(' ')}
        >
          <GameBoard rows={currentLevel.gridSize.rows} cols={currentLevel.gridSize.cols}>
            {boardNumbers.map((num) => {
              const isFound = foundNumbers.includes(num);
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
                  disabled={!isMyTurn || isWrongEffect || wrongNumber !== null}
                  onClick={handleNumberClick}
                />
              );
            })}
          </GameBoard>
        </div>
      </div>

      {/* Opponent Left Modal / Auto-Exit Notice */}
      {isOpponentLeft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="max-w-sm w-full text-center p-6 border-red-500/50 shadow-2xl">
            <span className="text-4xl block mb-3 animate-bounce">🚪</span>
            <h2 className="text-xl font-black text-white mb-2">
              Opponent Left the Room
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {opponentLeftMessage || 'Your opponent has exited the room. Returning to lobby...'}
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => {
                clearStoredDuelSession(roomCode);
                navigate('/online');
              }}
            >
              RETURN TO LOBBY NOW →
            </Button>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN EXPORT ROUTE
// ─────────────────────────────────────────────────────────────────────────────
export function OnlineMultiplayer() {
  const { roomCode: paramRoomCode } = useParams<{ roomCode?: string }>();

  if (!paramRoomCode) {
    return <OnlineLobby />;
  }

  const cleanRoomCode = paramRoomCode.trim().toUpperCase();
  return <OnlineRoom key={cleanRoomCode} roomCode={cleanRoomCode} />;
}
