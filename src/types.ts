import { getPropTypes, Options, PropTypeable } from 'prop-types-ts';
import * as t from 'io-ts';
import { Any, ArrayType, Context, Errors, failure, failures, OutputOf, success, Type, TypeOf, Validation } from 'io-ts';
import React, { WeakValidationMap } from 'react';
import { isRight } from 'fp-ts/Either';
import { DateTime } from 'luxon';

const dateStringRegex = /^\d{4}\/\d{2}\/\d{2}$/;

interface DateStringBrand {
  readonly DateString: unique symbol;
}

// eslint-disable-next-line eslint-comments/disable-enable-pair -- We want to disable for the rest of the file
/* eslint-disable @typescript-eslint/no-redeclare -- io-ts constants and types are easier with a single name */

export const DateString = t.brand(
  t.string,
  (value): value is t.Branded<string, DateStringBrand> => dateStringRegex.test(value),
  'DateString'
);
export type DateString = t.TypeOf<typeof DateString>;

const PageMetadataRequired = t.type({
  /// Page Title
  title: t.string,
  /// Page Revision, roughly in semver form
  revision: t.string,
  /// The date the page was last revised, in YYYY/MM/DD form
  revised: DateString,
});

const PageMetadataOptional = t.partial({
  /// The author of the page
  author: t.string,
  /// The date after which I should look at the page again, in YYYY/MM/DD form
  expires: DateString,
  /// A one-line abstract
  abstract: t.string,
  /// The copyright year.  Will default to the year last revised.
  copyright: t.string,
});

export const PageMetadata = t.intersection([PageMetadataRequired, PageMetadataOptional], 'PageMetadata');
export type PageMetadata = t.TypeOf<typeof PageMetadata>;

export const Page = t.interface(
  {
    name: t.string,
    metadata: PageMetadata,
  },
  'Page'
);
export type Page = t.TypeOf<typeof Page>;

export const fcProps = <T extends PropTypeable>(
  Component: React.FC<t.TypeOf<T>>,
  type: T,
  options?: Options
): React.FC<t.TypeOf<T>> => {
  if (process.env.NODE_ENV !== 'production') {
    const propsTypes = getPropTypes(type, options);
    const NewComponent = (...args: Parameters<React.FC<t.TypeOf<T>>>): ReturnType<React.FC<t.TypeOf<T>>> =>
      Component(...args);
    NewComponent.propTypes = propsTypes as unknown as WeakValidationMap<T>;
    NewComponent.displayName = type.name.replace('Props', '');
    return NewComponent;
  }
  return Component;
};

type SundayFromISOString = Type<DateTime, string, any>;
const anySunday: SundayFromISOString = new Type(
  'SundayFromISOString',
  (value: unknown): value is DateTime => value instanceof DateTime && value.weekday === 7,
  (value: any, context: Context): Validation<DateTime> => {
    if (!(typeof value === 'string')) {
      return failure(value, context, 'Expected a string');
    }
    const dt = DateTime.fromISO(value, { zone: 'UTC' });
    if (!dt.isValid) {
      return failure(value, context, `Invalid date: ${dt.invalidReason}, ${dt.invalidExplanation}`);
    }
    if (dt.weekday !== 7) {
      return failure(value, context, 'Expected a Sunday');
    }
    if (!dt.startOf('day').equals(dt)) {
      return failure(value, context, 'Expected a date, no time value');
    }
    return success(dt);
  },
  (value: DateTime): string => value.toISODate()
);

type ArrayEx<C extends Any> = Type<Array<TypeOf<C>>, Array<OutputOf<C>>, any>;

const array = <C extends Any>(itemType: C): ArrayEx<C> =>
  new ArrayType<typeof itemType, Array<TypeOf<typeof itemType>>, Array<OutputOf<typeof itemType>>, any>(
    `Array<${itemType.name}`,
    (val: unknown): val is Array<TypeOf<typeof itemType>> => {
      if (val instanceof Array) {
        return val.every((el) => itemType.is(el));
      }
      return false;
    },
    (val: any, context: Context): Validation<Array<TypeOf<typeof itemType>>> => {
      if (!(val instanceof Array)) {
        return failure(val, context, 'Not an array');
      }
      const values: Array<TypeOf<typeof itemType>> = [];
      const errors: Errors = [];
      val.forEach((element: unknown) => {
        const validation = itemType.validate(element, context);
        if (isRight(validation)) {
          values.push(validation.right);
        } else {
          errors.push(...validation.left);
        }
      });
      if (errors.length > 0) {
        return failures(errors);
      }
      return success(values);
    },
    (val: Array<TypeOf<typeof itemType>>): OutputOf<C> => val.map((item) => itemType.encode(item)),
    itemType
  );

/// Given a type, try to retain its shape without constraining the types of leaves
type Shape<T extends Any> = {
  [K in keyof T['_O']]: T['_A'][K] extends any[] ? Array<Shape<T['_A'][K][number]>> : T['_O'][K];
};

/// Matches the "shape" of the type, with arrays in place but otherwise `any`.
type ShapeOf<T extends Any> = Shape<TypeOf<T>>;

/// Details passed to the Articles index page.
export const ArticlesProps = t.interface({ pages: t.array(Page) }, 'ArticlesProps');
export type ArticlesProps = t.TypeOf<typeof ArticlesProps>;

/// A member of the NCC tech team
export const TechTeamPerson = t.interface({ name: t.string }, 'TechTeamPerson');
export type TechTeamPerson = t.TypeOf<typeof TechTeamPerson>;

/// When a particular group of people became the effective tech team
export const TechTeamEpoch = t.interface({ people: array(TechTeamPerson), start: anySunday }, 'TechTeamEpoch');
export type TechTeamEpoch = t.TypeOf<typeof TechTeamEpoch>;

/// Instances where someone other than the person on rotation took (or plans to take) tech.
export const TechTeamOverride = t.interface({ name: t.string, date: anySunday }, 'TechTeamOverride');
export type TechTeamOverride = t.TypeOf<typeof TechTeamOverride>;

/// Details of who is on the tech team and when
export const TechTeamRotaProps = t.interface(
  { epochs: array(TechTeamEpoch), overrides: array(TechTeamOverride) },
  'TechTeamRotaProps'
);
export type TechTeamRotaProps = ShapeOf<typeof TechTeamRotaProps>;
