import { useState, useEffect, useCallback } from 'react';
import { adminService, type AdminRoleItem, type BannedUser, type LevelTimeLimitItem } from '../../services/adminService';
import { formatTimeMs } from '../../utils/scoring';

export function AdminSettings() {
  const [admins, setAdmins] = useState<AdminRoleItem[]>([]);
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [timeLimits, setTimeLimits] = useState<LevelTimeLimitItem[]>([]);
  const [health, setHealth] = useState<{ supabaseConnected: boolean; databaseLatencyMs: number; projectRef: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms state
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'moderator' | 'admin' | 'superadmin'>('admin');
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState<string>('');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminSettingsData();
      setAdmins(data.admins);
      setBans(data.bans);
      setTimeLimits(data.timeLimits);
      setHealth(data.systemHealth);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUserId.trim()) return;

    const ok = await adminService.grantAdminRole(newAdminUserId.trim(), newAdminRole);
    if (ok) {
      showNotification(`Granted ${newAdminRole} role to ${newAdminUserId.slice(0, 8)}...`);
      setNewAdminUserId('');
      loadData();
    } else {
      showNotification('Failed to grant role. Check user ID and permissions.', 'error');
    }
  };

  const handleRevokeRole = async (userId: string, username: string) => {
    if (window.confirm(`Revoke admin privileges for @${username}?`)) {
      const ok = await adminService.revokeAdminRole(userId);
      if (ok) {
        showNotification(`Revoked privileges for @${username}.`);
        loadData();
      } else {
        showNotification('Failed to revoke role.', 'error');
      }
    }
  };

  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUserId.trim() || !banReason.trim()) return;

    const duration = banDays ? parseInt(banDays, 10) : undefined;
    const ok = await adminService.banUser({
      userId: banUserId.trim(),
      reason: banReason.trim(),
      durationDays: duration,
    });

    if (ok) {
      showNotification(`Player account banned.`);
      setBanUserId('');
      setBanReason('');
      setBanDays('');
      loadData();
    } else {
      showNotification('Failed to execute ban.', 'error');
    }
  };

  const handleLiftBan = async (userId: string) => {
    if (window.confirm('Lift this ban and restore player access?')) {
      const ok = await adminService.unbanUser(userId);
      if (ok) {
        showNotification('Player ban lifted.');
        loadData();
      } else {
        showNotification('Failed to unban user.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>⚙️</span> Admin Security & Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role-based access control, player bans, anti-cheat thresholds, and infrastructure diagnostics.
          </p>
        </div>

        {health && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold ${
                health.supabaseConnected
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-800/40 text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${health.supabaseConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {health.supabaseConnected ? 'Supabase Live' : 'Offline / Standalone'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-300">
              Ping: <strong className="text-white">{health.databaseLatencyMs}ms</strong>
            </span>
          </div>
        )}
      </div>

      {notice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-500 text-sm">
          <span className="inline-block animate-spin mr-2">◷</span> Loading admin configuration...
        </div>
      ) : (
        <>
          {/* ── SECTION 1: ADMIN ROLES ─────────────────────────────────────── */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>🛡️</span> Admin & Moderator Team
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Users with authorized access to this control room.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                {admins.length} Active Officers
              </span>
            </div>

            {/* Admins Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Administrator</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3">Granted</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {admins.map((admin) => (
                    <tr key={admin.userId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                            {admin.avatar}
                          </span>
                          <div>
                            <span className="font-bold text-white">@{admin.username}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">({admin.displayName})</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          {admin.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {admin.userId}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                        {new Date(admin.grantedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleRevokeRole(admin.userId, admin.username)}
                          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-[11px] transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grant New Role Form */}
            <form onSubmit={handleGrantRole} className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-end gap-3">
              <div className="flex-1 space-y-1 w-full">
                <label className="text-[11px] font-semibold text-slate-400">Target User ID (UUID)</label>
                <input
                  type="text"
                  placeholder="e.g. b332418b-2e97-4a90-84c5-fc4660c18841"
                  value={newAdminUserId}
                  onChange={(e) => setNewAdminUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="w-full md:w-44 space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Role Authority</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Administrator</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
              >
                + Grant Privileges
              </button>
            </form>
          </div>

          {/* ── SECTION 2: BANNED PLAYERS ──────────────────────────────────── */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>🚫</span> Active Player Bans
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accounts blocked from recording games and leaderboard placement.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300">
                {bans.length} Banned
              </span>
            </div>

            {/* Bans Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Banned On</th>
                    <th className="py-2.5 px-3">Expires</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No active player bans. All accounts are currently in good standing.
                      </td>
                    </tr>
                  ) : (
                    bans.map((ban) => (
                      <tr key={ban.user_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-rose-400">
                            @{ban.profiles?.username || ban.user_id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                          {ban.reason}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                          {new Date(ban.banned_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                          {ban.expires_at ? new Date(ban.expires_at).toLocaleDateString() : 'Permanent'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleLiftBan(ban.user_id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                          >
                            Lift Ban
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Issue Ban Form */}
            <form onSubmit={handleCreateBan} className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">User ID (UUID)</label>
                <input
                  type="text"
                  placeholder="Target user UUID..."
                  value={banUserId}
                  onChange={(e) => setBanUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-400">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Automated script injection / impossible solve time"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 items-end">
                <div className="w-24 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Days</label>
                  <input
                    type="number"
                    placeholder="Perm"
                    value={banDays}
                    onChange={(e) => setBanDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                >
                  Ban Player
                </button>
              </div>
            </form>
          </div>

          {/* ── SECTION 3: ANTI-CHEAT TIME THRESHOLDS ──────────────────────── */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>⚡</span> Anti-Cheat Level Minimum Time Limits
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Runs submitted faster than the minimum threshold are automatically flagged for manual review.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 pt-2">
              {timeLimits.map((l) => (
                <div key={l.levelId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-black text-amber-400">L{l.levelId}</span>
                    <span className="text-[10px] text-slate-500">{l.numberCount}n</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    Min: {formatTimeMs(l.minTimeMs)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Par: {formatTimeMs(l.parTimeMs)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
