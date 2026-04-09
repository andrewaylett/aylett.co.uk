import type { JSX } from 'react';

export function BasicFallback(): JSX.Element {
  return (
    <div>
      Rendering...{' '}
      <span className="appear-10s">do you have Javascript enabled?</span>
    </div>
  );
}
