import React from 'react';

export function BasicFallback() {
  return (
    <div>
      Rendering...{' '}
      <span className="appear-10s">do you have Javascript enabled?</span>
    </div>
  );
}
