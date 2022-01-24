import { describe, it } from '@jest/globals';

import { getStaticProps } from '../../src/ssr/tech-team';
import { TechTeamRotaProps } from '../../src/types';
import { expect } from '../types';

describe('Validates Type of Static Props', () => {
  it('Type checks', async () => {
    const result = await getStaticProps({});

    expect('props' in result).toBeTruthy();

    const decoded = TechTeamRotaProps.decode('props' in result && result.props);

    expect(decoded).toBeRight();
  });
});
