import React from 'react';

import { DayCard } from '@/app/tools/sun/dayCard';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { LOC_A, LOC_B } from '@/app/tools/sun/locations';
import { Card } from '@/components/Card';

export function DayCards() {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <Card className="flex-1 min-w-50">
        <DayCard locRef={LOC_A} color={COL_A} />
      </Card>
      <Card className="flex-1 min-w-50">
        <DayCard locRef={LOC_B} color={COL_B} />
      </Card>
    </div>
  );
}
