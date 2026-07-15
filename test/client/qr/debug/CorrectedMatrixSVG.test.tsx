import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { CorrectedMatrixSVG } from '@/client/qr/debug/CorrectedMatrixSVG';
import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';

describe('CorrectedMatrixSVG', () => {
  const matrix = QrCode.encodeText('TEST', Ecc.MEDIUM).getModules();

  it('renders the matrix with a quiet-zone margin', () => {
    render(<CorrectedMatrixSVG matrix={matrix} label="test matrix" />);
    const svg = screen.getByTestId('qr-debug-corrected-svg');
    expect(svg).toHaveAttribute(
      'viewBox',
      `0 0 ${matrix.length + 8} ${matrix.length + 8}`,
    );
    expect(svg.querySelector('path')).not.toBeNull();
    expect(screen.queryAllByTestId('qr-debug-corrected-module')).toHaveLength(
      0,
    );
  });

  it('overlays corrected modules and quiet-zone violations at offset positions', () => {
    render(
      <CorrectedMatrixSVG
        matrix={matrix}
        label="test matrix"
        diffs={[
          { x: 9, y: 10, sampled: true, canonical: false, region: 'data' },
        ]}
        quietZoneViolations={[{ x: -2, y: 3 }]}
      />,
    );
    const diff = screen.getByTestId('qr-debug-corrected-module');
    expect(diff).toHaveAttribute('x', '13');
    expect(diff).toHaveAttribute('y', '14');
    const violation = screen.getByTestId('qr-debug-quiet-violation');
    expect(violation).toHaveAttribute('x', '2');
    expect(violation).toHaveAttribute('y', '7');
  });
});
