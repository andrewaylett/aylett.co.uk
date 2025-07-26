import React from 'react';

import { type DynamicOptionsLoadingProps } from 'next/dist/shared/lib/dynamic';

export function LoadingComponent(props: DynamicOptionsLoadingProps) {
  return (
    <div>
      {props.error ? (
        <div>Error: {props.error.message}</div>
      ) : props.isLoading ? (
        <div>Loading component...</div>
      ) : (
        <div>In an odd state: {JSON.stringify(props)}</div>
      )}
    </div>
  );
}
