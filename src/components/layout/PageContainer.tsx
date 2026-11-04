import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Max width class, default is max-w-5xl */
  maxWidth?: string;
  className?: string;
}

/**
 * PageContainer — wraps every page with correct top/bottom padding
 * accounting for both the fixed Navbar (desktop) and MobileNavigation (mobile).
 */
export function PageContainer({ children, maxWidth = 'max-w-3xl', className = '' }: PageContainerProps) {
  return (
    <main
      className={[
        'w-full mx-auto px-3 sm:px-4 md:px-6',
        maxWidth,
        // top padding for desktop navbar and notch safe area
        'pt-[calc(var(--nav-height)+var(--safe-area-top)+1rem)] md:pt-[calc(var(--nav-height)+1.5rem)]',
        // bottom padding for mobile navigation bar and home indicator safe area
        'pb-[calc(var(--mobile-nav-height)+var(--safe-area-bottom)+1.25rem)] md:pb-8',
        'animate-page',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </main>
  );
}
