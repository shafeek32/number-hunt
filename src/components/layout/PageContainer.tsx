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
        'w-full mx-auto px-4',
        maxWidth,
        // top padding for desktop navbar
        'pt-[calc(var(--nav-height)+1.5rem)]',
        // bottom padding for mobile nav
        'pb-[calc(var(--mobile-nav-height)+1.5rem)] md:pb-8',
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
