import type { GetStaticProps } from 'next';

import type { TechTeamRotaProps } from '../types';

export const getStaticProps: GetStaticProps<TechTeamRotaProps> = async () => ({
  props: {
    epochs: [
      {
        people: [{ name: 'Andrew' }, { name: 'Donald' }, { name: 'Joe' }],
        start: '2022-01-02',
      },
    ],
    overrides: [
      { name: 'Andrew', date: '2022-01-09' },
      { name: 'Andrew', date: '2022-01-16' },
      { name: 'Joe', date: '2022-01-23' },
    ],
  },
});
