import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';

interface Props {
  onToggleMobileMenu?: () => void;
}

export function AdminHeader({ onToggleMobileMenu }: Props) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-xs font-black tracking-widest uppercase text-slate-400">
            CONTROL CENTER
          </span>
          <span className="hidden sm:inline-block text-slate-400">•</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-bold bg-slate-900 border border-slate-800 text-slate-300">
            <span
              className={[
                'w-2 h-2 rounded-full',
                isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400',
              ].join(' ')}
            />
            <span>{isSupabaseConfigured ? 'Live Database' : 'Local Sandbox'}</span>
          </div>
        </div>
      </div>

      {/* Right: Admin Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer border border-transparent hover:border-slate-800 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center font-black text-xs shadow-xs">
            {profile?.avatar || '⚡'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-white leading-tight">
              {profile?.display_name || user?.email?.split('@')[0] || 'Admin'}
            </span>
            <span className="text-[0.65rem] text-slate-400 font-medium">
              @{profile?.username || 'admin'}
            </span>
          </div>
          <span className="text-slate-400 text-xs font-bold ml-1">▾</span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-scale-in text-xs">
            <div className="px-4 py-2 border-b border-slate-800 mb-1">
              <div className="font-bold text-white truncate">
                {profile?.display_name || 'Admin User'}
              </div>
              <div className="text-[0.68rem] text-slate-400 truncate">
                {user?.email || 'admin@numberhunt.com'}
              </div>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase bg-sky-500/15 text-sky-400">
                Administrator
              </span>
            </div>

            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span>👤</span>
              <span>My Profile</span>
            </Link>

            <Link
              to="/levels"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span>🎮</span>
              <span>Switch to Player Mode</span>
            </Link>

            <div className="border-t border-slate-800 my-1" />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors font-bold cursor-pointer"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
