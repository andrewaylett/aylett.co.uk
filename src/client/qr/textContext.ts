import { createContext } from 'react';

export interface TextContextProps {
  resetText: () => void;
  updateResetRef: (resetRef: (() => void) | null) => void;
}

export const TextContext = createContext<null | TextContextProps>(null);
