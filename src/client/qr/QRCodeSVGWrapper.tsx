import React, { type RefObject, useCallback, useEffect, useRef } from 'react';

import { QRCodeSVG } from 'qrcode.react';

type QRCodeSVGProps =
  typeof QRCodeSVG extends React.ForwardRefExoticComponent<infer T> ? T : never;

export interface Size {
  width: number;
  height: number;
}

export function QRCodeSVGWrapper({
  ref: outerRef,
  dimensionsRef,
  ...props
}: Omit<QRCodeSVGProps, 'ref'> & {
  ref: RefObject<SVGSVGElement | null>;
  dimensionsRef: RefObject<Size>;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({
    width: 29,
    height: 29,
  });
  dimensionsRef.current = dimensions;

  useEffect(() => {
    outerRef.current = ref.current;
    return () => {
      outerRef.current = null;
    };
  }, [outerRef]);

  const callback = useCallback((element: SVGSVGElement) => {
    const viewBox = element.getAttribute('viewBox');
    const viewBoxValues = viewBox?.split(' ');
    const width = viewBoxValues ? Number.parseInt(viewBoxValues[2], 10) : 64;
    const height = viewBoxValues ? Number.parseInt(viewBoxValues[3], 10) : 64;
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    const svg = ref.current;
    svg.dataset.testid = 'qr-code';

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        callback(mutation.target as SVGSVGElement);
      }
    });
    observer.observe(ref.current, {
      attributes: true,
      attributeFilter: ['viewBox'],
    });

    callback(ref.current);

    return () => {
      observer.disconnect();
      delete svg.dataset.testid;
    };
  }, [callback]);

  const height = dimensions.height * 4;
  const width = dimensions.width * 4;

  return <QRCodeSVG {...props} height={height} width={width} ref={ref} />;
}
