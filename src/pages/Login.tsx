import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to sign in. Please check your credentials.');
    } else {
      navigate('/profile');
    }
  };

  return (
    <PageContainer maxWidth="max-w-sm">
      <div className="text-center mb-6 pt-4">
        <h1 className="num-display font-black text-3xl text-[var(--color-text-primary)]">
          SIGN IN
        </h1>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
          Save your progress and compete on the global leaderboard
        </p>
      </div>

      <Card padding="lg" className="mb-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-[var(--color-error-light)] border border-[var(--color-error)] text-[var(--color-error)] text-xs rounded-xl font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="login-email">
              EMAIL
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hunter@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-tag" htmlFor="login-password">
              PASSWORD
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
          Don't have an account?{' '}
          <Link to="/signup" className="font-bold text-[var(--color-accent)] hover:underline">
            Create account
          </Link>
        </div>
      </Card>

      {/* ── ACCOUNT PERKS ───────────────────────── */}
      <Card padding="md" className="bg-[var(--color-surface-2)] border-dashed">
        <div className="text-[0.7rem] font-black text-[var(--color-text-muted)] tracking-wider uppercase mb-2">
          ACCOUNT BENEFITS
        </div>
        <ul className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1.5">
          <li className="flex items-center gap-2">✓ Cloud personal bests & stars</li>
          <li className="flex items-center gap-2">✓ Global & Level leaderboards</li>
          <li className="flex items-center gap-2">✓ Official Daily Challenge ranking</li>
          <li className="flex items-center gap-2">✓ Multi-device sync</li>
        </ul>
      </Card>

      <div className="text-center mt-6">
        <Link to="/levels" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-bold">
          ← Continue Playing as Guest
        </Link>
      </div>
    </PageContainer>
  );
}
