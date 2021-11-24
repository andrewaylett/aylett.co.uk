import React from 'react';
import { getYear } from 'date-fns';
import * as t from 'io-ts';

import { fcProps } from './types';

const FooterProps = t.partial(
  {
    author: t.string,
    copyright: t.string,
  },
  'FooterProps'
);
// eslint-disable-next-line @typescript-eslint/no-redeclare
type FooterProps = t.TypeOf<typeof FooterProps>;

const Footer: React.FunctionComponent<FooterProps> = fcProps(
  ({ author, copyright }) => (
    <footer style={{ paddingTop: '1em' }}>
      Copyright © {author || 'Andrew Aylett'}, {copyright || getYear(Date.now())}
    </footer>
  ),
  FooterProps
);

export default Footer;
