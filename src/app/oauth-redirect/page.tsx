import 'server-only';

import type { JSX } from 'react';

import type { Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';

export const metadata: Metadata = {
  title: 'Home Assistant Desktop',
  icons: {
    other: {
      rel: 'redirect_uri',
      url: 'homeassistant://oauth-callback',
    },
  },
};

function Redirect(): JSX.Element {
  return (
    <PageStructure
      header={
        <>
          <h1 className="text-center">Home Assistant Desktop</h1>
        </>
      }
      schemaType={''}
      resource={''}
    >
      <p>
        If you see this, it's probably because something has gone wrong with
        logging into your Home Assistant instance.
      </p>
    </PageStructure>
  );
}

export default Redirect;
