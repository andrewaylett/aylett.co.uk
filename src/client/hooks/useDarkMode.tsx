import { useSyncExternalStore } from 'react';

import { useDarkModeStore } from '@/client/hooks/useDarkModeStore';

export function useDarkMode(): boolean {
  const { subscribe, snapshot } = useDarkModeStore();
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
