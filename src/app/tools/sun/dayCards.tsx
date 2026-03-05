'use client';

import React from 'react';

import { useSun } from '@/app/tools/sun/sunContext';
import { DayCard } from '@/app/tools/sun/dayCard';
import { COL_A, COL_B } from '@/app/tools/sun/colours';

export function DayCards() {
  const { a, b } = useSun();
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <DayCard location={a} color={COL_A} />
      <DayCard location={b} color={COL_B} />
    </div>
  );
}
