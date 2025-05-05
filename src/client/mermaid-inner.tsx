import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import mermaid, { type MermaidConfig } from 'mermaid';

import { memo } from '../types';

import { useDarkMode } from './darkMode';
import { type MermaidProps } from './mermaid';

const DEFAULT_CONFIG: MermaidConfig = {
  startOnLoad: false,
  theme: 'default',
  logLevel: 'error',
  securityLevel: 'loose',
  arrowMarkerAbsolute: false,
  flowchart: {
    htmlLabels: true,
    curve: 'linear',
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 120,
    height: 30,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    rightAngles: false,
    showSequenceNumbers: false,
  },
  gantt: {
    titleTopMargin: 25,
    barHeight: 16,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 11,
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
  },
} as const;

const MermaidInner = memo(function MermaidInner({
  children,
  config,
}: PropsWithChildren<MermaidProps>) {
  const [isRendered, setIsRendered] = useState(false);

  const mermaidDiv = useRef<HTMLDivElement>(null);

  const isDarkMode = useDarkMode();

  useEffect(() => {
    mermaid.initialize({
      ...DEFAULT_CONFIG,
      ...config,
      theme: isDarkMode ? 'dark' : 'default',
    });
  }, [config, isDarkMode]);

  const runMermaid = useCallback(async (): Promise<void> => {
    if (!mermaidDiv.current) throw new Error('Mermaid div not found');
    await mermaid.run({ nodes: [mermaidDiv.current] });
  }, []);

  useEffect(() => {
    void runMermaid().then(() => {
      setIsRendered(true);
    });
    return () => setIsRendered(false);
  }, [runMermaid]);

  return (
    <>
      <span>{isRendered ? '' : 'Rendering...'}</span>
      <div className={isRendered ? '' : 'hidden'} ref={mermaidDiv}>
        {children}
      </div>
    </>
  );
});

export default MermaidInner;
