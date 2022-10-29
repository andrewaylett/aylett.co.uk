import type { ReactElement } from 'react';

export type PageMetadata = {
  /// Page Title
  title: string;
  /// Page Revision, roughly in semver form
  revision: string;
  /// The date the page was last revised, in YYYY/MM/DD form
  revised: string;
  /// The author of the page
  author: string;
  /// The date after which I should look at the page again, in YYYY/MM/DD form
  expires?: string;
  /// A one-line abstract
  abstract?: string;
  /// The copyright year.  Will default to the year last revised.
  copyright?: string;
};

export interface Page {
  metadata: PageMetadata;
  content: ReactElement;
  id: string;
}
