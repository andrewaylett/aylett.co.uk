import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { AnalysisPanel } from '@/client/qr/debug/AnalysisPanel';

describe('AnalysisPanel quiet zone truncation', () => {
  it('shows "all sides — likely a render" when all four sides are outside frame', () => {
    render(
      <AnalysisPanel
        result={{
          ok: false,
          stage: 'locate',
          message: '',
          partial: {
            quietZoneTruncation: {
              top: true,
              right: true,
              bottom: true,
              left: true,
            },
          },
        }}
      />,
    );
    const dd = screen.getByTestId('qr-debug-quiet-truncation');
    expect(dd.textContent).toContain('all sides');
    expect(dd.textContent).toContain('likely a render');
  });

  it('lists only the truncated sides when the frame clips partially', () => {
    render(
      <AnalysisPanel
        result={{
          ok: false,
          stage: 'locate',
          message: '',
          partial: {
            quietZoneTruncation: {
              top: true,
              right: false,
              bottom: false,
              left: true,
            },
          },
        }}
      />,
    );
    const dd = screen.getByTestId('qr-debug-quiet-truncation');
    expect(dd.textContent).toBe('top, left');
  });

  it('omits the truncation row entirely when no sides are clipped', () => {
    render(
      <AnalysisPanel
        result={{
          ok: false,
          stage: 'locate',
          message: '',
          partial: {
            quietZoneTruncation: {
              top: false,
              right: false,
              bottom: false,
              left: false,
            },
          },
        }}
      />,
    );
    expect(screen.queryByTestId('qr-debug-quiet-truncation')).toBeNull();
  });
});
