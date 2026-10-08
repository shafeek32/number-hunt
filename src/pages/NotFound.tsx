import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';

export function NotFound() {
  return (
    <PageContainer maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center gap-6 pt-12">
        <div
          className="num-display font-black text-[var(--color-accent)] leading-none"
          style={{ fontSize: 'clamp(5rem, 25vw, 8rem)' }}
          aria-hidden="true"
        >
          404
        </div>

        <div>
          <h1 className="font-black text-xl uppercase tracking-widest text-[var(--color-text-primary)]">
            Page Not Found
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            This number isn't on the board.
          </p>
        </div>

        <Link to="/" tabIndex={-1}>
          <Button variant="primary" size="md" id="back-home-btn">
            ← Back to Home
          </Button>
        </Link>
      </div>
    </PageContainer>
  );
}
