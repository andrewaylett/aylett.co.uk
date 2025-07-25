import React, { type RefObject, useEffect, useRef } from 'react';

import { QRCodeSVG } from 'qrcode.react';

type QRCodeSVGProps =
  typeof QRCodeSVG extends React.ForwardRefExoticComponent<infer T> ? T : never;

export function QRCodeSVGWrapper({
  ref: outerRef,
  setDimensions: outerSetDimensions,
  ...props
}: Omit<QRCodeSVGProps, 'ref'> & {
  ref: RefObject<SVGSVGElement | null>;
  setDimensions: ({ height, width }: { height: number; width: number }) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({
    width: 29,
    height: 29,
  });

  useEffect(() => {
    outerRef.current = ref.current;
    return () => {
      outerRef.current = null;
    };
  }, [outerRef]);

  useEffect(() => {
    if (!ref.current) return;

    const svg = ref.current;
    svg.dataset.testid = 'qr-code';

    const callback = (element: SVGSVGElement) => {
      const viewBox = element.getAttribute('viewBox');
      const viewBoxValues = viewBox?.split(' ');
      const width = viewBoxValues ? Number.parseInt(viewBoxValues[2], 10) : 64;
      const height = viewBoxValues ? Number.parseInt(viewBoxValues[3], 10) : 64;
      setDimensions({ width, height });
      outerSetDimensions({ width, height });
    };

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
  }, [outerSetDimensions]);

  const height = dimensions.height * 4;
  const width = dimensions.width * 4;

  return <QRCodeSVG {...props} height={height} width={width} ref={ref} />;
}
