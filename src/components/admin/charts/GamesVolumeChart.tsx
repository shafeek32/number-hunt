import { useState } from 'react';
import type { GamesTimePoint } from '../../../types/admin';

interface Props {
  data: GamesTimePoint[];
  title?: string;
  isHourly?: boolean;
}

export function GamesVolumeChart({ data, title = 'GAMES VOLUME', isHourly = false }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex items-center justify-center h-64 text-slate-500 text-xs">
        No game volume data recorded for this time window.
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.started, d.completed)),
    5
  );

  const paddingX = 40;
  const paddingY = 25;
  const width = 640;
  const height = 240;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Bar group layout
  const barGroupWidth = chartW / data.length;
  const barWidth = Math.max(4, Math.min(14, barGroupWidth * 0.35));

  const totalStarted = data.reduce((sum, d) => sum + d.started, 0);
  const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
  const overallRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 100;

  const yTicks = [
    Math.round(maxVal),
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🎮</span> {title}
          </h3>
          <p className="text-[0.7rem] text-slate-400 mt-0.5">
            {isHourly ? 'Hourly' : 'Daily'} volume: Started vs. Completed
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-500" />
            <span className="text-slate-400 text-[0.7rem]">Started ({totalStarted})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span className="text-emerald-400 text-[0.7rem]">Completed ({totalCompleted})</span>
          </div>
          <div className="text-[0.7rem] text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md">
            {overallRate}% Clr
          </div>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
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

          {/* Bars */}
          {data.map((d, idx) => {
            const groupCenterX = paddingX + (idx + 0.5) * barGroupWidth;
            const startedH = (d.started / maxVal) * chartH;
            const completedH = (d.completed / maxVal) * chartH;

            const startedY = paddingY + chartH - startedH;
            const completedY = paddingY + chartH - completedH;

            const startedX = groupCenterX - barWidth - 1;
            const completedX = groupCenterX + 1;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Background highlight pill on hover */}
                {isHovered && (
                  <rect
                    x={groupCenterX - barGroupWidth / 2}
                    y={paddingY}
                    width={barGroupWidth}
                    height={chartH}
                    fill="#38bdf8"
                    fillOpacity="0.06"
                    rx="4"
                  />
                )}

                {/* Started Bar */}
                <rect
                  x={startedX}
                  y={startedY}
                  width={barWidth}
                  height={Math.max(2, startedH)}
                  rx="2"
                  fill={isHovered ? '#94a3b8' : '#64748b'}
                  className="transition-colors"
                />

                {/* Completed Bar */}
                <rect
                  x={completedX}
                  y={completedY}
                  width={barWidth}
                  height={Math.max(2, completedH)}
                  rx="2"
                  fill={isHovered ? '#34d399' : '#10b981'}
                  className="transition-colors"
                />

                {/* X-axis labels */}
                {(() => {
                  const step = Math.ceil(data.length / 7);
                  const isLabelVisible = idx % step === 0 || idx === data.length - 1;
                  if (!isLabelVisible) return null;

                  return (
                    <text
                      x={groupCenterX}
                      y={height - 6}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {d.timeLabel}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute top-2 pointer-events-none bg-slate-950/95 border border-emerald-500/40 p-2 rounded-lg shadow-xl text-center transform -translate-x-1/2 min-w-28 transition-transform duration-75"
            style={{
              left: `${((paddingX + (hoveredIndex + 0.5) * barGroupWidth) / width) * 100}%`,
            }}
          >
            <div className="text-[0.65rem] text-slate-400 font-mono mb-1">
              {data[hoveredIndex].timeLabel}
            </div>
            <div className="flex items-center justify-between text-xs gap-3 font-bold">
              <span className="text-slate-400">Started:</span>
              <span className="text-white font-mono">{data[hoveredIndex].started}</span>
            </div>
            <div className="flex items-center justify-between text-xs gap-3 font-bold">
              <span className="text-emerald-400">Done:</span>
              <span className="text-emerald-400 font-mono">{data[hoveredIndex].completed}</span>
            </div>
            <div className="text-[0.65rem] font-bold text-amber-400 pt-1 mt-1 border-t border-slate-800">
              {data[hoveredIndex].started > 0
                ? Math.round((data[hoveredIndex].completed / data[hoveredIndex].started) * 100)
                : 100}% rate
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[0.7rem] text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <span>Total runs: <b>{totalStarted} started</b></span>
        <span>Successful clear rate: <b className="text-emerald-400">{overallRate}%</b></span>
      </div>
    </div>
  );
}
