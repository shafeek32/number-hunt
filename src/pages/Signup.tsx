import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';

const AVATAR_OPTIONS = ['⚡', '🎯', '👑', '🔥', '🏹', '🚀', '🦊', '⭐'];

export function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setErrorMsg('Username must be between 3 and 20 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg('Username can only contain lowercase letters, numbers, and underscores.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await signUp({
      email: email.trim(),
      password,
      username: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      avatar,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to create account. Please try again.');
    } else {
      navigate('/profile');
    }
  };

  return (
    <PageContainer maxWidth="max-w-sm">
      <div className="text-center mb-6 pt-4">
        <h1 className="num-display font-black text-3xl text-[var(--color-text-primary)]">
          CREATE ACCOUNT
        </h1>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
          Join the hunt and compete globally
        </p>
      </div>

      <Card padding="lg" className="mb-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-[var(--color-error-light)] border border-[var(--color-error)] text-[var(--color-error)] text-xs rounded-xl font-bold">
              {errorMsg}
            </div>
          )}

          {/* Avatar selection */}
          <div className="flex flex-col gap-1.5">
            <label className="label-tag">CHOOSE YOUR AVATAR</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setAvatar(icon)}
                  className={[
                    'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform cursor-pointer',
                    avatar === icon
                      ? 'bg-[var(--color-accent)] text-white scale-110 shadow-sm'
                      : 'bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]',
                  ].join(' ')}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="signup-username">
              USERNAME (UNIQUE HANDLE)
            </label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="speed_hunter"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="signup-displayname">
              DISPLAY NAME
            </label>
            <input
              id="signup-displayname"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Walker"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="signup-email">
              EMAIL
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="signup-password">
              PASSWORD (MIN 6 CHARS)
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
            className="mt-2"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
