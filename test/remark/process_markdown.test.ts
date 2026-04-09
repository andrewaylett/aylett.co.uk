import { createElement } from 'react';

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

// Mock next/dynamic before importing the processors, since components.tsx
// uses it to load the Mermaid component. We must use the global jest.mock()
// rather than the @jest/globals import so Jest's SWC transform hoists the
// call above the ES module imports.
jest.unstable_mockModule('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const MockDynamic = ({ children }: { children?: React.JSX.Element }) =>
      createElement('div', { 'data-testid': 'mock-mermaid' }, children);
    MockDynamic.displayName = 'MockDynamic';
    return MockDynamic;
  },
}));

describe('markdown pipeline', () => {
  afterEach(cleanup);

  describe('frontmatter extraction', () => {
    it('extracts valid YAML frontmatter onto vfile.data', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = [
        '---',
        'title: Hello World',
        'tags:',
        '  - test',
        '---',
        '',
        'Body text.',
      ].join('\n');

      const file = await intoText.process(md);
      expect(file.data.frontMatter).toMatchObject({
        type: 'yaml',
        value: expect.stringContaining('title: Hello World'),
      });
    });

    it('leaves frontMatter absent when there is no YAML block', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = 'Just a paragraph.';

      const file = await intoText.process(md);
      expect(file.data.frontMatter).toBeUndefined();
    });

    it('does not treat a heading as frontmatter', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = ['# A Heading', '', 'Paragraph text.'].join('\n');

      const file = await intoText.process(md);
      expect(file.data.frontMatter).toBeUndefined();
      expect(String(file)).toContain('# A Heading');
    });
  });

  describe('smartypants (smart quotes)', () => {
    it('converts straight quotes to curly quotes', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = 'She said "hello" to him.';

      const file = await intoText.process(md);
      const output = String(file);
      expect(output).toContain('\u201C'); // left double quote
      expect(output).toContain('\u201D'); // right double quote
    });
  });

  describe('dash conversion', () => {
    it('converts spaced double-dash to em-dash', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = 'Something -- something else.';

      const file = await intoText.process(md);
      expect(String(file)).toContain('\u2014'); // em-dash
    });

    it('leaves double-dash without spaces alone', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = ['```', 'flag --verbose', '```'].join('\n');

      const file = await intoText.process(md);
      expect(String(file)).toContain('--verbose');
    });
  });

  describe('intoText round-trip', () => {
    it('preserves headings, paragraphs, and links', async () => {
      const { intoText } = await import('@/remark/process_markdown');

      const md = [
        '# Title',
        '',
        'A paragraph with a [link](https://example.com).',
        '',
        '## Subtitle',
        '',
        'Another paragraph.',
      ].join('\n');

      const file = await intoText.process(md);
      const output = String(file);
      expect(output).toContain('# Title');
      expect(output).toContain('## Subtitle');
      expect(output).toContain('[link](https://example.com)');
      expect(output).toContain('Another paragraph.');
    });
  });

  describe('intoReact rendering', () => {
    it('renders headings with slug IDs and applies smart quotes', async () => {
      const { intoReact } = await import('@/remark/process_markdown');

      const md = ['# Introduction', '', 'She said "hello" to the world.'].join(
        '\n',
      );

      const file = await intoReact.process(md);
      const element = file.result as React.ReactElement;

      render(element);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAttribute('id', 'introduction');
      expect(heading).toHaveTextContent('Introduction');

      // Smart quotes should appear in the rendered output
      const paragraph = screen.getByText(/hello/);
      expect(paragraph.textContent).toContain('\u201C');
      expect(paragraph.textContent).toContain('\u201D');
    });

    it('renders links as anchor elements', async () => {
      const { intoReact } = await import('@/remark/process_markdown');

      const md = 'Visit [Example](https://example.com) today.';

      const file = await intoReact.process(md);
      render(file.result as React.ReactElement);

      const link = screen.getByRole('link', { name: 'Example' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('mermaid pre-stripping', () => {
    it('removes the <pre> wrapper around mermaid code blocks', async () => {
      const { intoReact } = await import('@/remark/process_markdown');

      const md = ['```mermaid', 'graph LR', '  A --> B', '```'].join('\n');

      const file = await intoReact.process(md);
      const { container } = render(file.result as React.ReactElement);

      // The mermaid code block should be rendered via the mock dynamic
      // component (no <pre> wrapper)
      const mermaidEl = screen.getByTestId('mock-mermaid');
      expect(mermaidEl).toBeInTheDocument();

      // There should be no <pre> element wrapping the mermaid content
      const preElements = container.querySelectorAll('pre');
      expect(preElements).toHaveLength(0);
    });
  });
});
