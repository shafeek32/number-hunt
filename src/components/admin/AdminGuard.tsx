import { useState, useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';

interface Props {
  children?: ReactNode;
}

export function AdminGuard({ children }: Props) {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);
    adminService
      .isAdmin()
      .then((allowed) => {
        if (active) {
          setIsAdmin(allowed);
          setCheckingRole(false);
        }
      })
      .catch(() => {
        if (active) {
          setIsAdmin(false);
          setCheckingRole(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  // Loading state
  if (authLoading || checkingRole || isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-slate-700 border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
          VERIFYING ADMIN PRIVILEGES...
        </span>
      </div>
    );
  }

  // Not authenticated at all -> redirect to login
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Authenticated, but not an admin -> show 403 Forbidden Gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 select-none">
        <div className="bg-slate-900 border border-rose-500/20 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>

          <h2 className="text-xl font-black text-white tracking-wide mb-1">
            Access Denied
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Admin privileges required to view this area.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-6 text-left text-xs">
            <div className="text-[0.68rem] text-slate-400 uppercase font-bold mb-1">
              Signed in account
            </div>
            <div className="font-bold text-slate-200">
              {profile?.display_name || 'Player'} (@{profile?.username || 'user'})
            </div>
            <div className="text-[0.7rem] text-slate-400 font-mono">
              {user.email}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to="/levels"
              className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold rounded-xl transition-colors text-center"
            >
              ← Back to Number Hunt
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Sign out & switch account
            </button>
          </div>

          <p className="text-[0.65rem] text-slate-400 mt-6 pt-4 border-t border-slate-800/80 leading-relaxed">
            Database administrators: Ensure this user's UUID is assigned an admin role in the Supabase <code className="text-sky-400">admin_roles</code> table.
          </p>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
}
