import React, { act } from 'react';

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { type ArticleSchema, type TypeFrom } from '../types';

import { ListingEntry } from './ListingEntry';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

describe('ArticleEntry', () => {
  it('renders article title and author when metadata is resolved', async () => {
    const metadata = Promise.resolve({
      abstract: 'An example abstract',
      author: 'John Doe',
      lifecycle: 'live',
      revised: '2023/10/01',
      revision: '2',
      title: 'Example Article',
      expires: '',
      copyright: '',
      description: '',
      tags: [''],
    } satisfies TypeFrom<ArticleSchema>);

    await act(
      async () =>
        await render(
          <ListingEntry metadata={metadata} name="example-article" />,
        ),
    );

    expect(screen.queryByText('Example Article')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).toBeInTheDocument();
  });

  it('renders "Draft" label for draft articles', async () => {
    const metadata = Promise.resolve({
      abstract: '',
      author: '',
      lifecycle: 'draft',
      revised: '2023/10/01',
      revision: '1',
      title: 'Draft Article',
      expires: '',
      copyright: '',
      description: '',
      tags: [''],
    } satisfies TypeFrom<ArticleSchema>);

    await act(
      async () =>
        await render(<ListingEntry metadata={metadata} name="draft-article" />),
    );

    expect(screen.queryByText('Draft:')).toBeInTheDocument();
    expect(screen.queryByText('Draft Article')).toBeInTheDocument();
  });

  it('renders revision and revised date correctly', async () => {
    const metadata = Promise.resolve({
      abstract: '',
      author: '',
      lifecycle: 'live',
      revised: '2023/10/01',
      revision: '3',
      title: 'Revised Article',
      expires: '',
      copyright: '',
      description: '',
      tags: [''],
    } satisfies TypeFrom<ArticleSchema>);

    await act(
      async () =>
        await render(
          <ListingEntry metadata={metadata} name="revised-article" />,
        ),
    );

    expect(screen.queryByText('v3, 2023')).toBeInTheDocument();
  });

  it('renders abstract when provided', async () => {
    const metadata = Promise.resolve({
      abstract: 'This is an abstract.',
      author: '',
      lifecycle: 'live',
      revised: '2023/10/01',
      revision: '1',
      title: 'Abstract Article',
      expires: '',
      copyright: '',
      description: '',
      tags: [''],
    } satisfies TypeFrom<ArticleSchema>);

    await act(
      async () =>
        await render(
          <ListingEntry metadata={metadata} name="abstract-article" />,
        ),
    );

    expect(screen.queryByText(':')).toBeInTheDocument();
    expect(screen.queryByText('This is an abstract.')).toBeInTheDocument();
  });

  it('handles missing metadata gracefully', async () => {
    const metadata = Promise.resolve({
      abstract: '',
      author: '',
      lifecycle: 'obsolete',
      revised: '',
      revision: '0',
      title: '',
      expires: '',
      copyright: '',
      description: '',
      tags: [''],
    } satisfies TypeFrom<ArticleSchema>);

    await act(
      async () =>
        await render(<ListingEntry metadata={metadata} name="empty-article" />),
    );

    expect(screen.queryByText('Draft:')).not.toBeInTheDocument();
    expect(screen.queryByText(':')).not.toBeInTheDocument();
  });
});
