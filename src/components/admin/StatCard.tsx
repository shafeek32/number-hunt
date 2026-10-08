interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  accent?: 'blue' | 'purple' | 'red' | 'green' | 'orange' | 'cyan' | 'yellow' | 'pink';
  trend?: string;
  trendPositive?: boolean;
}

const ACCENT_BORDER_CLASSES = {
  blue:   'border-l-4 border-l-sky-500',
  purple: 'border-l-4 border-l-purple-500',
  red:    'border-l-4 border-l-red-500',
  green:  'border-l-4 border-l-emerald-500',
  orange: 'border-l-4 border-l-orange-500',
  cyan:   'border-l-4 border-l-cyan-500',
  yellow: 'border-l-4 border-l-amber-500',
  pink:   'border-l-4 border-l-pink-500',
};

const ACCENT_BG_CLASSES = {
  blue:   'bg-sky-500/10 text-sky-400',
  purple: 'bg-purple-500/10 text-purple-400',
  red:    'bg-red-500/10 text-red-400',
  green:  'bg-emerald-500/10 text-emerald-400',
  orange: 'bg-orange-500/10 text-orange-400',
  cyan:   'bg-cyan-500/10 text-cyan-400',
  yellow: 'bg-amber-500/10 text-amber-400',
  pink:   'bg-pink-500/10 text-pink-400',
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'orange',
  trend,
  trendPositive,
}: Props) {
  return (
    <div
      className={[
        'bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-700 shadow-sm',
        ACCENT_BORDER_CLASSES[accent],
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <span
            className={[
              'w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0',
              ACCENT_BG_CLASSES[accent],
            ].join(' ')}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="num-display text-2xl font-black text-white tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={[
              'text-[0.7rem] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5',
              trendPositive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400',
            ].join(' ')}
          >
            {trendPositive ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>

      {sub && (
        <span className="text-[0.7rem] text-slate-400 mt-1.5 font-medium truncate">
          {sub}
        </span>
      )}
    </div>
  );
}
