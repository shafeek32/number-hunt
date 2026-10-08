import { useState, useEffect, useCallback, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import type { AdminOverview, FlaggedGame, BannedUser, PlayerSearchResult } from '../services/adminService';
import { formatTimeMs, formatScore } from '../utils/scoring';

// ─── TYPES ───────────────────────────────────────────────────
type AdminTab = 'overview' | 'flagged' | 'users' | 'bans';

// ─── HELPERS ─────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────
function OverviewTab({ data }: { data: AdminOverview | null }) {
  if (!data) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner" />
        <p>Loading stats…</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Players', value: data.total_players.toLocaleString(), icon: '👥', accent: 'accent-blue' },
    { label: 'Total Games', value: data.total_games.toLocaleString(), icon: '🎮', accent: 'accent-purple' },
    { label: 'Flagged Games', value: data.flagged_games.toLocaleString(), icon: '🚩', accent: 'accent-red' },
    { label: 'Verified Clean', value: data.verified_games.toLocaleString(), icon: '✅', accent: 'accent-green' },
    { label: 'Active Bans', value: data.active_bans.toLocaleString(), icon: '🔨', accent: 'accent-orange' },
    { label: 'Daily Challenges', value: data.daily_challenges_run.toLocaleString(), icon: '📅', accent: 'accent-cyan' },
    { label: 'Games (24h)', value: data.games_last_24h.toLocaleString(), icon: '⚡', accent: 'accent-yellow' },
    { label: 'New Players (24h)', value: data.new_players_last_24h.toLocaleString(), icon: '🌟', accent: 'accent-pink' },
  ];

  return (
    <div className="admin-overview">
      <div className="overview-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${s.accent}`}>
            <span className="stat-icon">{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="admin-info-box">
        <h3>⚙️ Phase 4 Anti-Cheat Active</h3>
        <ul>
          <li>🔍 <b>Auto-Flag Trigger</b> — DB trigger flags impossibly fast times and score mismatches on insert</li>
          <li>🎯 <b>Score Recomputation</b> — Edge Function recomputes score/accuracy/stars server-side</li>
          <li>🔑 <b>Anti-Replay Tokens</b> — One-time tokens prevent duplicate score submissions</li>
          <li>⏱️ <b>Rate Limiting</b> — Max 60 submissions per hour per user</li>
          <li>🚫 <b>Ban System</b> — Banned users are blocked at Edge Function level</li>
        </ul>
      </div>
    </div>
  );
}

// ─── FLAGGED SCORES TAB ───────────────────────────────────────
function FlaggedTab() {
  const [items, setItems] = useState<FlaggedGame[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getFlaggedGames({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      onlyUnverified: !showAll,
    });
    setItems(result.items);
    setCount(result.count);
    setLoading(false);
  }, [page, showAll]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id: string) => {
    await adminService.verifyGame(id, true);
    setItems((prev) => prev.filter((g) => g.id !== id));
    setCount((c) => c - 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this game record permanently?')) return;
    await adminService.deleteGame(id);
    setItems((prev) => prev.filter((g) => g.id !== id));
    setCount((c) => c - 1);
  };

  const handleBanUser = async (userId: string, username: string) => {
    const reason = window.prompt(`Ban reason for @${username}:`);
    if (!reason) return;
    const durStr = window.prompt('Duration in days? (leave blank for permanent)');
    const durationDays = durStr ? parseInt(durStr) : undefined;
    await adminService.banUser({ userId, reason, durationDays });
    load();
  };

  return (
    <div className="admin-flagged">
      <div className="flagged-header">
        <div className="flagged-title">
          <span className="flag-count">{count}</span>
          <span>{showAll ? 'Total flagged games' : 'Unreviewed flagged games'}</span>
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => { setShowAll(e.target.checked); setPage(0); }}
          />
          Show verified too
        </label>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="loading-spinner" /><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="admin-empty">
          <span>🎉</span>
          <p>No flagged games to review!</p>
        </div>
      ) : (
        <>
          <div className="flagged-table-wrapper">
            <table className="flagged-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Level</th>
                  <th>Time</th>
                  <th>Mistakes</th>
                  <th>Score</th>
                  <th>Stars</th>
                  <th>Reason</th>
                  <th>When</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((g) => (
                  <tr key={g.id} className={g.is_banned ? 'row-banned' : g.is_verified ? 'row-verified' : ''}>
                    <td className="player-cell">
                      <span className="player-avatar">{g.avatar}</span>
                      <div>
                        <span className="player-name">{g.display_name}</span>
                        <span className="player-username">@{g.username}</span>
                        {g.is_banned && <span className="badge badge-banned">BANNED</span>}
                      </div>
                    </td>
                    <td><span className="level-badge">L{g.level_id}</span></td>
                    <td className="time-cell">{formatTimeMs(g.time_ms)}</td>
                    <td className={g.mistakes === 0 ? 'cell-good' : 'cell-warn'}>{g.mistakes}</td>
                    <td className="score-cell">{formatScore(g.score)}</td>
                    <td>{'⭐'.repeat(g.stars)}</td>
                    <td>
                      <span className="flag-reason" title={g.flag_reason ?? ''}>
                        {g.flag_reason?.split(':')[0] ?? '—'}
                      </span>
                    </td>
                    <td className="time-ago">{timeAgo(g.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        {!g.is_verified && (
                          <button
                            className="btn-action btn-verify"
                            onClick={() => handleVerify(g.id)}
                            title="Mark as clean"
                          >
                            ✅
                          </button>
                        )}
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(g.id)}
                          title="Delete game"
                        >
                          🗑️
                        </button>
                        {!g.is_banned && (
                          <button
                            className="btn-action btn-ban"
                            onClick={() => handleBanUser(g.user_id, g.username)}
                            title="Ban player"
                          >
                            🔨
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {count > PAGE_SIZE && (
            <div className="pagination">
              <button
                className="btn-page"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="page-info">
                Page {page + 1} of {Math.ceil(count / PAGE_SIZE)}
              </span>
              <button
                className="btn-page"
                disabled={(page + 1) * PAGE_SIZE >= count}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── USER MANAGEMENT TAB ─────────────────────────────────────
function UsersTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlayerSearchResult | null>(null);
  const [userGames, setUserGames] = useState<FlaggedGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const found = await adminService.searchPlayers(q);
    setResults(found);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const selectUser = async (player: PlayerSearchResult) => {
    setSelectedUser(player);
    setLoadingGames(true);
    const games = await adminService.getUserGames(player.id);
    setUserGames(games);
    setLoadingGames(false);
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    const reason = window.prompt(`Ban reason for @${selectedUser.username}:`);
    if (!reason) return;
    const durStr = window.prompt('Duration in days? (leave blank for permanent)');
    const durationDays = durStr ? parseInt(durStr) : undefined;
    await adminService.banUser({ userId: selectedUser.id, reason, durationDays });
    setSelectedUser((prev) => prev ? { ...prev, is_banned: true, ban_reason: reason } : null);
  };

  const handleUnban = async () => {
    if (!selectedUser) return;
    await adminService.unbanUser(selectedUser.id);
    setSelectedUser((prev) => prev ? { ...prev, is_banned: false, ban_reason: undefined } : null);
  };

  return (
    <div className="admin-users">
      <div className="user-search-panel">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <div className="mini-spinner" />}
        </div>

        <div className="search-results">
          {results.map((r) => (
            <button
              key={r.id}
              className={`result-row ${selectedUser?.id === r.id ? 'selected' : ''}`}
              onClick={() => selectUser(r)}
            >
              <span className="result-avatar">{r.avatar}</span>
              <div className="result-info">
                <span className="result-name">{r.display_name}</span>
                <span className="result-username">@{r.username}</span>
              </div>
              <div className="result-badges">
                {r.is_admin && <span className="badge badge-admin">ADMIN</span>}
                {r.is_banned && <span className="badge badge-banned">BANNED</span>}
              </div>
            </button>
          ))}
          {results.length === 0 && query.trim() && !searching && (
            <p className="no-results">No players found for "{query}"</p>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="user-detail-panel">
          <div className="user-detail-header">
            <span className="detail-avatar">{selectedUser.avatar}</span>
            <div>
              <h3>{selectedUser.display_name}</h3>
              <span className="detail-username">@{selectedUser.username}</span>
              <span className="detail-since">
                Joined {new Date(selectedUser.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="user-actions">
              {selectedUser.is_banned ? (
                <button className="btn-admin btn-green" onClick={handleUnban}>
                  ✅ Unban Player
                </button>
              ) : (
                <button className="btn-admin btn-red" onClick={handleBan}>
                  🔨 Ban Player
                </button>
              )}
            </div>
          </div>

          {selectedUser.is_banned && (
            <div className="ban-notice">
              🚫 This player is currently banned. Reason: <b>{selectedUser.ban_reason}</b>
            </div>
          )}

          <h4 className="games-subheader">Recent Games</h4>
          {loadingGames ? (
            <div className="admin-loading"><div className="loading-spinner" /><p>Loading games…</p></div>
          ) : userGames.length === 0 ? (
            <p className="no-results">No games found.</p>
          ) : (
            <div className="user-games-list">
              {userGames.map((g) => (
                <div key={g.id} className={`user-game-row ${g.is_flagged ? 'flagged' : ''} ${g.is_verified ? 'verified' : ''}`}>
                  <span className="ug-level">L{g.level_id}</span>
                  <span className="ug-time">{formatTimeMs(g.time_ms)}</span>
                  <span className="ug-score">{formatScore(g.score)}</span>
                  <span className="ug-stars">{'⭐'.repeat(g.stars)}</span>
                  <span className="ug-mistakes">{g.mistakes}×</span>
                  {g.is_flagged && (
                    <span className="ug-flag" title={g.flag_reason ?? ''}>🚩</span>
                  )}
                  {g.is_verified && (
                    <span className="ug-verified">✅</span>
                  )}
                  <span className="ug-date">{timeAgo(g.completed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BANS TAB ─────────────────────────────────────────────────
function BansTab() {
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getActiveBans(PAGE_SIZE, 0);
    setBans(result.items);
    setCount(result.count);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnban = async (userId: string) => {
    await adminService.unbanUser(userId);
    setBans((prev) => prev.filter((b) => b.user_id !== userId));
    setCount((c) => c - 1);
  };

  return (
    <div className="admin-bans">
      <div className="bans-header">
        <span className="ban-count">{count} active ban{count !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="loading-spinner" /><p>Loading…</p></div>
      ) : bans.length === 0 ? (
        <div className="admin-empty"><span>✅</span><p>No active bans.</p></div>
      ) : (
        <div className="bans-list">
          {bans.map((b) => {
            const prof = b.profiles;
            const isPermanent = !b.expires_at;
            const expiresIn = b.expires_at
              ? Math.max(0, Math.ceil((new Date(b.expires_at).getTime() - Date.now()) / 86400000))
              : null;

            return (
              <div key={b.user_id} className="ban-row">
                <div className="ban-player">
                  <span className="ban-avatar">{prof?.avatar ?? '👤'}</span>
                  <div>
                    <span className="ban-name">{prof?.display_name ?? 'Unknown'}</span>
                    <span className="ban-username">@{prof?.username ?? b.user_id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="ban-meta">
                  <span className="ban-reason">{b.reason}</span>
                  <span className={`ban-duration ${isPermanent ? 'permanent' : ''}`}>
                    {isPermanent ? '🔒 Permanent' : `⏳ ${expiresIn}d remaining`}
                  </span>
                  <span className="ban-since">Banned {timeAgo(b.banned_at)}</span>
                </div>
                <button
                  className="btn-admin btn-green"
                  onClick={() => handleUnban(b.user_id)}
                >
                  Lift Ban
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ADMIN PAGE ──────────────────────────────────────────
export function Admin() {
  const auth = useContext(AuthContext);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!auth?.user) { setIsAdmin(false); return; }
    adminService.isAdmin().then(setIsAdmin);
  }, [auth?.user]);

  // Load overview when tab = overview
  useEffect(() => {
    if (tab === 'overview' && !overview) {
      setLoadingOverview(true);
      adminService.getOverview().then((data) => {
        setOverview(data);
        setLoadingOverview(false);
      });
    }
  }, [tab, overview]);

  // Loading state
  if (isAdmin === null || auth?.loading) {
    return (
      <div className="admin-gate">
        <div className="loading-spinner large" />
      </div>
    );
  }

  // Not authorized
  if (!auth?.user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <div className="gate-card">
          <span className="gate-icon">🔒</span>
          <h2>Access Denied</h2>
          <p>You don't have admin permissions.</p>
          <a href="/" className="btn-admin btn-primary">← Back to Home</a>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'flagged', label: 'Flagged Scores', icon: '🚩' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'bans', label: 'Active Bans', icon: '🔨' },
  ];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-title-group">
            <span className="admin-badge">ADMIN</span>
            <h1 className="admin-title">Moderation Dashboard</h1>
            <p className="admin-subtitle">Number Hunt • Anti-Cheat Control Panel</p>
          </div>
          <button
            className="btn-admin btn-ghost"
            onClick={() => { setOverview(null); adminService.getOverview().then(setOverview); }}
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {tab === 'overview' && (
          loadingOverview
            ? <div className="admin-loading"><div className="loading-spinner" /><p>Loading…</p></div>
            : <OverviewTab data={overview} />
        )}
        {tab === 'flagged' && <FlaggedTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'bans' && <BansTab />}
      </div>
    </div>
  );
}
