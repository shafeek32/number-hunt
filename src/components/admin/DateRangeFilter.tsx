import { useState } from 'react';
import type { DateRangeFilter, DateRangeKey } from '../../types/admin';

interface Props {
  value: DateRangeFilter;
  onChange: (filter: DateRangeFilter) => void;
}

const PRESETS: { key: DateRangeKey; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d',        label: '7 Days' },
  { key: '30d',       label: '30 Days' },
  { key: 'all',       label: 'All Time' },
  { key: 'custom',    label: 'Custom' },
];

export function DateRangeFilterComponent({ value, onChange }: Props) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate || '');
  const [customEnd, setCustomEnd] = useState(value.endDate || '');

  const handleSelect = (key: DateRangeKey) => {
    if (key === 'custom') {
      setShowCustomModal(true);
    } else {
      onChange({ key });
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      onChange({ key: 'custom', startDate: customStart, endDate: customEnd });
      setShowCustomModal(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
      {PRESETS.map((p) => {
        const isActive = value.key === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => handleSelect(p.key)}
            className={[
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none',
              isActive
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
            ].join(' ')}
          >
            {p.label}
          </button>
        );
      })}

      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-3">Select Custom Date Range</h4>
            <div className="flex flex-col gap-3 text-xs mb-4">
              <div>
                <label className="text-slate-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
                className="px-4 py-1.5 text-xs font-bold bg-[var(--color-accent)] text-white rounded-lg disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const DateRangeFilterBar = DateRangeFilterComponent;

