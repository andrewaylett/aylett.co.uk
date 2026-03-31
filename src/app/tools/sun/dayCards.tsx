import React from 'react';

import { DayCard } from '@/app/tools/sun/dayCard';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { LOC_A, LOC_B } from '@/app/tools/sun/locations';

export function DayCards() {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <DayCard locRef={LOC_A} color={COL_A} />
      <DayCard locRef={LOC_B} color={COL_B} />
    </div>
  );
}
