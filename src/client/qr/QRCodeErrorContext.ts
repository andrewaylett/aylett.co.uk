import { createContext } from 'react';

export interface QRCodeErrorContextProps {
  resetText: () => void;
  updateResetRef: (resetRef: (() => void) | undefined) => void;
}

export const QRCodeErrorContext = createContext<null | QRCodeErrorContextProps>(
  null,
);
