import React, {
  type PropsWithChildren,
  type ReactNode,
  Suspense,
  use,
} from 'react';

import { type JSONSchema7 } from 'json-schema';

import { Footer, type FooterProps } from './Footer';

import { type Markdown } from '@/remark/traverse';
import { type LifecycleSchema, type TaggedSchema } from '@/types';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export interface PageStructureProps<
  T extends Promise<Markdown<JSONSchema7 & TaggedSchema>>,
  Schema extends LifecycleSchema = T extends Promise<
    Markdown<infer S extends LifecycleSchema & TaggedSchema>
  >
    ? S
    : never,
> extends FooterProps {
  breadcrumbs?: Breadcrumbs;
  header: ReactNode;
  lifecycle?: Promise<Schema['properties']['lifecycle']['enum'][number]>;
  schemaType: string;
  resource: string;
}

export function PageStructure<
  T extends Promise<Markdown<JSONSchema7 & TaggedSchema>>,
>({
  author,
  breadcrumbs,
  children,
  copyright,
  header,
  keywords,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps<T>>): ReactNode {
  return (
    <>
      {lifecycle && use(lifecycle) === 'draft' ? (
        <div className="bg-draft" />
      ) : (
        ''
      )}
      <div
        className="flex flex-col min-h-screen grid-cols-centre"
        vocab="https://schema.org/"
        resource={resource}
        typeof={schemaType}
      >
        {breadcrumbs === undefined ? null : (
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        )}
        <div className="">{header}</div>
        <Suspense
          fallback={
            <div>
              Rendering...{' '}
              <span className="appear-10s">
                do you have Javascript enabled?
              </span>
            </div>
          }
        >
          <main className="hyphens-manual">{children}</main>
          <div className="grow bg-transparent min-h-[50vh] content-end overflow-visible">
            <Footer author={author} keywords={keywords} copyright={copyright} />
          </div>
        </Suspense>
      </div>
    </>
  );
}
