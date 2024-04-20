'use client';

import React, {
  FC,
  PropsWithChildren,
  Suspense,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import 'client-only';

import { useDarkMode } from './darkMode';

import type { Mermaid as MermaidLib, MermaidConfig } from 'mermaid';

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
};

export interface MermaidProps {
  name?: string;
  config?: MermaidConfig;
}

const mermaidImport = import('mermaid') as Promise<{ default: MermaidLib }>;

export const Mermaid: React.FC<PropsWithChildren<MermaidProps>> = ({
  ...props
}) => {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <MermaidInner {...props} />
    </Suspense>
  );
};

export const MermaidInner: FC<PropsWithChildren<MermaidProps>> = ({
  children,
  config,
}) => {
  const mermaidLib = use(mermaidImport).default;

  const isDarkMode = useDarkMode();

  useEffect(() => {
    mermaidLib.initialize({
      ...DEFAULT_CONFIG,
      ...config,
      theme: isDarkMode ? 'dark' : 'default',
    });
  }, [mermaidLib, isDarkMode]);

  const [isRendered, setIsRendered] = useState(false);

  const mermaidDiv = useRef<HTMLDivElement>(null);

  const runMermaid = useCallback(async (): Promise<void> => {
    if (!mermaidDiv.current) return;
    await mermaidLib.run({ nodes: [mermaidDiv.current] });
  }, [mermaidLib, mermaidDiv]);

  useEffect(() => {
    void runMermaid().then(() => {
      setIsRendered(true);
    });
  }, [runMermaid]);

  return (
    <>
      <span>{isRendered ? '' : 'Rendering...'}</span>
      <div className={isRendered ? '' : 'hidden'} ref={mermaidDiv}>
        {children}
      </div>
    </>
  );
};
