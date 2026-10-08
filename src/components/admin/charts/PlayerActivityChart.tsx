import { useState } from 'react';
import type { ActivityTimePoint } from '../../../types/admin';

interface Props {
  data: ActivityTimePoint[];
  title?: string;
  isHourly?: boolean;
}

export function PlayerActivityChart({ data, title = 'PLAYER ACTIVITY', isHourly = false }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-center justify-center h-64 text-slate-500 text-xs">
        No activity data recorded for this time window.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.activePlayers), 5);
  const minVal = 0;
  const paddingX = 40;
  const paddingY = 25;
  const width = 640;
  const height = 240;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Calculate points
  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartW;
    const y = paddingY + chartH - ((d.activePlayers - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, ...d };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr = `${points[0].x},${paddingY + chartH} ${polylineStr} ${points[points.length - 1].x},${paddingY + chartH}`;

  // Y-axis ticks (4 ticks)
  const yTicks = [
    Math.round(maxVal),
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  const totalPlayersInView = data.reduce((sum, d) => sum + d.activePlayers, 0);
  const peakPoint = [...points].sort((a, b) => b.activePlayers - a.activePlayers)[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>📈</span> {title}
          </h3>
          <p className="text-[0.7rem] text-slate-400 mt-0.5">
            {isHourly ? 'Hourly unique active players' : 'Daily unique active players'}
          </p>
        </div>
        <div className="text-right">
          <div className="num-display text-base font-black text-sky-400">
            {peakPoint?.activePlayers ?? 0}
          </div>
          <div className="text-[0.65rem] text-slate-400 font-semibold">PEAK PLAYERS</div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Ticks */}
          {yTicks.map((val, idx) => {
            const y = paddingY + (idx / 4) * chartH;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <polygon points={areaStr} fill="url(#activityGradient)" />

          {/* Activity Line */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis labels */}
          {points.map((p, idx) => {
            // Display label every N steps to avoid clutter
            const step = Math.ceil(data.length / 7);
            const isLabelVisible = idx % step === 0 || idx === data.length - 1;
            if (!isLabelVisible) return null;

            return (
              <text
                key={idx}
                x={p.x}
                y={height - 6}
                fill="#64748b"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {p.timeLabel}
              </text>
            );
          })}

          {/* Interactive hover circles */}
          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === idx ? 6 : 3.5}
                fill={hoveredIndex === idx ? '#38bdf8' : '#0f172a'}
                stroke="#38bdf8"
                strokeWidth={hoveredIndex === idx ? 3 : 2}
                className="transition-all"
              />
              {/* Invisible large tap target */}
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute top-2 pointer-events-none bg-slate-950/90 border border-sky-500/40 px-3 py-1.5 rounded-lg shadow-xl text-center transform -translate-x-1/2 transition-transform duration-75"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
            }}
          >
            <div className="text-[0.65rem] text-slate-400 font-mono">
              {points[hoveredIndex].timeLabel}
            </div>
            <div className="text-xs font-black text-sky-400">
              {points[hoveredIndex].activePlayers} active player{points[hoveredIndex].activePlayers === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[0.7rem] text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <span>Active windows recorded: <b>{data.length}</b></span>
        <span>Average: <b>{(totalPlayersInView / Math.max(1, data.length)).toFixed(1)} / window</b></span>
      </div>
    </div>
  );
}
