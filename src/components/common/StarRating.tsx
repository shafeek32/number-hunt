import { useState, useEffect } from 'react';

interface StarRatingProps {
  stars: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function StarRating({
  stars,
  maxStars = 3,
  size = 'md',
  animate = false,
}: StarRatingProps) {
  const [animatedStars, setAnimatedStars] = useState(0);

  useEffect(() => {
    if (!animate) return;

    setAnimatedStars(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i <= stars; i++) {
      timers.push(
        setTimeout(() => {
          setAnimatedStars(i);
        }, i * 220)
      );
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [stars, animate]);

  const displayStars = animate ? animatedStars : stars;

  const sizeStyles = {
    sm: 'text-base gap-0.5',
    md: 'text-2xl gap-1',
    lg: 'text-4xl gap-2',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center ${sizeStyles}`}
      aria-label={`${stars} of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= displayStars;

        return (
          <span
            key={i}
            className={[
              'transition-all duration-300 transform select-none',
              isFilled
                ? 'scale-100 text-amber-400 drop-shadow-sm'
                : 'scale-90 text-[var(--color-border-strong)] opacity-40',
              animate && starIndex === displayStars ? 'scale-125' : '',
            ].join(' ')}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
