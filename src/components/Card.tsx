import { Suspense } from 'react';

import { BasicFallback } from '@/components/BasicFallback';

export interface CardProps {
  className?: string;
}

export function Card({
  children,
  className,
}: React.PropsWithChildren<CardProps>): JSX.Element {
  return (
    <div
      className={`contain-content bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-2 mb-2 ${className ?? ''}`}
    >
      <Suspense fallback={<BasicFallback />}>{children}</Suspense>
    </div>
  );
}
