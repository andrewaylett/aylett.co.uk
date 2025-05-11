import React from 'react';

export function Optional({
  children,
  condition,
}: React.PropsWithChildren<{ condition?: unknown }>) {
  return condition ? <span>{children}</span> : <></>;
}
