'use client';

import React from 'react';

import {
  type Loc,
  type LocationRef,
  PRESET_LOCATIONS,
} from '@/app/tools/sun/locations';
import { useLoc } from '@/app/tools/sun/sunContext';

export function LocationPicker({
  label,
  locRef,
  color,
}: {
  label: string;
  locRef: LocationRef;
  color: string;
}) {
  const [loc, setLoc] = useLoc(locRef);
  const mode = PRESET_LOCATIONS.includes(loc) ? 'preset' : 'custom';

  function setCustomField<K extends keyof Loc>(k: K, v: Loc[K]) {
    setLoc((prev: Loc) => ({ ...prev, [k]: v }));
  }

  return (
    <>
      <p className="text-xs font-semibold mb-2" style={{ color }}>
        {label}
      </p>
      <div className="flex gap-2 mb-2.5">
        <button
          className={`text-xs px-2 py-0.5 rounded cursor-pointer border-none ${
            mode === 'preset'
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
              : 'bg-transparent text-slate-400 dark:text-slate-500'
          }`}
          onClick={() => {
            if (mode === 'custom') {
              setLoc(PRESET_LOCATIONS[0]);
            }
          }}
        >
          Preset
        </button>
        <button
          className={`text-xs px-2 py-0.5 rounded cursor-pointer border-none ${
            mode === 'custom'
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
              : 'bg-transparent text-slate-400 dark:text-slate-500'
          }`}
          onClick={() => {
            if (mode === 'preset') {
              setCustomField('name', '');
            }
          }}
        >
          Custom
        </button>
      </div>
      <select
        value={(() => {
          const i = PRESET_LOCATIONS.indexOf(loc);
          return i === -1 ? '' : String(i);
        })()}
        onChange={(e) => {
          const i = Number.parseInt(e.target.value, 10);
          setLoc(PRESET_LOCATIONS[i]);
        }}
        className={`${mode === 'preset' ? 'block' : 'hidden'} w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm`}
      >
        <option value="">— select —</option>
        {PRESET_LOCATIONS.map((l, i) => (
          <option key={l.name} value={i}>
            {l.name}
          </option>
        ))}
      </select>
      <div
        className={`${mode === 'custom' ? 'block' : 'hidden'} flex flex-col gap-1.5`}
      >
        {[
          ['name', 'Location name'],
          ['lat', 'Latitude'],
          ['lng', 'Longitude'],
        ].map(([k, ph]) => (
          <input
            key={k}
            placeholder={ph}
            value={loc[k as keyof Loc]}
            onChange={(e) => {
              setCustomField(k as keyof Loc, e.target.value);
            }}
            className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-xs"
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
      </p>
    </>
  );
}
