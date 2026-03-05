'use client';

import React from 'react';

import { useSun } from '@/app/tools/sun/sunContext';
import { LocationPicker } from '@/app/tools/sun/locationPicker';
import { COL_A, COL_B } from '@/app/tools/sun/colours';

export function LocationPickers() {
  const { a, b } = useSun();
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <LocationPicker label="Location A" locState={a} color={COL_A} />
      <LocationPicker label="Location B" locState={b} color={COL_B} />
    </div>
  );
}
