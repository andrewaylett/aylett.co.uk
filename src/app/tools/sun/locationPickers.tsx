import React from 'react';

import { LocationPicker } from '@/app/tools/sun/locationPicker';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { LOC_A, LOC_B } from '@/app/tools/sun/locations';

export function LocationPickers() {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <LocationPicker label="Location A" locRef={LOC_A} color={COL_A} />
      <LocationPicker label="Location B" locRef={LOC_B} color={COL_B} />
    </div>
  );
}
