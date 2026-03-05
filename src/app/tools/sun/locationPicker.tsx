import React from 'react';

import { PRESET_LOCATIONS } from '@/app/tools/sun/locations';
import { type CustomLoc, type LocState } from '@/app/tools/sun/sunContext';

export function LocationPicker({
  label,
  locState,
  color,
}: {
  label: string;
  locState: LocState;
  color: string;
}) {
  const { loc, setLoc, mode, setMode, custom, setCustomField } = locState;

  return (
    <div className="flex-1 min-w-55 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs font-semibold mb-2" style={{ color }}>
        {label}
      </p>
      <div className="flex gap-2 mb-2.5">
        {(['preset', 'custom'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
            }}
            className={`text-xs px-2 py-0.5 rounded cursor-pointer border-none ${
              mode === m
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-transparent text-slate-400 dark:text-slate-500'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {mode === 'preset' && (
        <select
          value={(() => {
            const i = PRESET_LOCATIONS.indexOf(loc);
            return i === -1 ? '' : String(i);
          })()}
          onChange={(e) => {
            const i = Number.parseInt(e.target.value, 10);
            setLoc(PRESET_LOCATIONS[i]);
          }}
          className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm"
        >
          <option value="">— select —</option>
          {PRESET_LOCATIONS.map((l, i) => (
            <option key={l.name} value={i}>
              {l.name}
            </option>
          ))}
        </select>
      )}
      {mode === 'custom' && (
        <div className="flex flex-col gap-1.5">
          {[
            ['name', 'Location name'],
            ['lat', 'Latitude'],
            ['lng', 'Longitude'],
          ].map(([k, ph]) => (
            <input
              key={k}
              placeholder={ph}
              value={custom[k as keyof CustomLoc]}
              onChange={(e) => {
                setCustomField(k as keyof CustomLoc, e.target.value);
              }}
              className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-xs"
            />
          ))}
          <button
            onClick={() => {
              const lat = Number.parseFloat(custom.lat),
                lng = Number.parseFloat(custom.lng);
              if (custom.name && !Number.isNaN(lat) && !Number.isNaN(lng))
                setLoc({ name: custom.name, lat, lng });
            }}
            className="text-xs bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 border-none rounded-md py-1 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
      </p>
    </div>
  );
}
