import React from 'react';

export function FoundWords({
  found,
  total,
  maxLen,
}: {
  found: string[];
  total: number;
  maxLen: number;
}): JSX.Element {
  return (
    <div
      className={`min-w-[20ch] h-full flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4`}
    >
      <div className="flex justify-between items-baseline mb-2.5">
        <strong className="text-[0.95rem] text-blue-700 dark:text-blue-300">
          Found words
        </strong>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {found.length}/{total}
        </span>
      </div>
      {found.length === 0 ? (
        <div className="text-slate-400 dark:text-slate-500 text-sm">
          Nothing yet — start tracing!
        </div>
      ) : (
        <ul className="list-none m-0 p-0 overflow-y-auto">
          {[...found].reverse().map((w) => (
            <li
              key={w}
              className={[
                'animate-fade-in px-2 py-1.5 rounded-lg mb-1 text-[0.95rem] tracking-[0.06em]',
                'flex justify-between',
                w.length === maxLen
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-white/60 dark:bg-white/5',
              ].join(' ')}
            >
              <span>{w}</span>
              {w.length === maxLen && <span>★</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
