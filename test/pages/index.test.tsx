/**
 * @jest-environment jsdom
 */

import * as React from 'react';

import { describe, it, expect } from '@jest/globals';

import { render } from '../testUtils';
import Home from '../../src/app/page';

describe('Home page', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<Home />, {});

    expect(asFragment()).toMatchSnapshot();
  });
});
