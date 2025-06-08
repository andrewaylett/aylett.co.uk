import React from 'react';

import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen, act } from '@testing-library/react';

import { ListingEntry } from './ListingEntry';

import { type ArticleSchema, type TypeFrom } from '@/types';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

function resolvablePromise<T>(): {
  resolve: (value: T) => void;
  promise: Promise<T>;
} {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { resolve: resolve!, promise };
}

describe('ArticleEntry', () => {
  afterEach(cleanup);

  it('renders article title and author when metadata is resolved', async () => {
    const { resolve, promise: metadata } =
      resolvablePromise<TypeFrom<ArticleSchema>>();

    await act(() =>
      render(<ListingEntry metadata={metadata} name="example-article" />),
    );

    act(() => {
      resolve({
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
        tag: 'article',
      } satisfies TypeFrom<ArticleSchema>);
    });

    await expect(
      screen.findByText('Example Article'),
    ).resolves.toBeInTheDocument();
    await expect(screen.findByText('John Doe')).resolves.toBeInTheDocument();
  });

  it('renders "Draft" label for draft articles', async () => {
    const { resolve, promise: metadata } =
      resolvablePromise<TypeFrom<ArticleSchema>>();

    await act(() =>
      render(<ListingEntry metadata={metadata} name="draft-article" />),
    );

    act(() => {
      resolve({
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
        tag: 'article',
      } satisfies TypeFrom<ArticleSchema>);
    });

    await expect(screen.findByText('Draft:')).resolves.toBeInTheDocument();
    await expect(
      screen.findByText('Draft Article'),
    ).resolves.toBeInTheDocument();
  });

  it('renders revision and revised date correctly', async () => {
    const { resolve, promise: metadata } =
      resolvablePromise<TypeFrom<ArticleSchema>>();

    await act(() =>
      render(<ListingEntry metadata={metadata} name="revised-article" />),
    );

    act(() => {
      resolve({
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
        tag: 'article',
      } satisfies TypeFrom<ArticleSchema>);
    });

    await expect(screen.findByText('v3, 2023')).resolves.toBeInTheDocument();
  });

  it('renders abstract when provided', async () => {
    const { resolve, promise: metadata } =
      resolvablePromise<TypeFrom<ArticleSchema>>();

    await act(() =>
      render(<ListingEntry metadata={metadata} name="abstract-article" />),
    );

    act(() => {
      resolve({
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
        tag: 'article',
      } satisfies TypeFrom<ArticleSchema>);
    });

    await expect(screen.findByText(':')).resolves.toBeInTheDocument();
    await expect(
      screen.findByText('This is an abstract.'),
    ).resolves.toBeInTheDocument();
  });

  it('handles missing metadata gracefully', async () => {
    const { resolve, promise: metadata } =
      resolvablePromise<TypeFrom<ArticleSchema>>();

    await act(() =>
      render(<ListingEntry metadata={metadata} name="empty-article" />),
    );

    act(() => {
      resolve({
        abstract: '',
        author: '',
        lifecycle: 'obsolete',
        revised: '',
        revision: '0',
        title: 'Dummy',
        expires: '',
        copyright: '',
        description: '',
        tags: [''],
        tag: 'article',
      } satisfies TypeFrom<ArticleSchema>);
    });

    await expect(screen.findByText('Dummy')).resolves.toBeInTheDocument();
    expect(screen.queryByText('Draft:')).not.toBeInTheDocument();
    expect(screen.queryByText(':')).not.toBeInTheDocument();
  });
});
