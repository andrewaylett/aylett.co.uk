import { createContext, type Context } from 'react';

export interface QRCodeErrorContextProps {
  resetText: () => void;
  updateResetRef: (resetRef: (() => void) | undefined) => void;
}

export const QRCodeErrorContext: Context<null | QRCodeErrorContextProps> =
  createContext<null | QRCodeErrorContextProps>(null);
