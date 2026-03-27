import { describe, expect, it } from '@jest/globals';
import { Temporal } from 'temporal-polyfill';

import { toJulianDay, computeSolarParams } from '@/app/tools/sun/solarParams';

const toDeg = (rad: number) => (rad * 180) / Math.PI;

describe('toJulianDay', () => {
  it('gives the Meeus midnight-based JD for J2000.0 epoch date', () => {
    // Standard J2000.0 is JD 2 451 545.0 at noon. Midnight-based formula
    // gives 2 451 544.5 for 2000-01-01.
    const jd = toJulianDay(Temporal.PlainDate.from('2000-01-01'));
    expect(jd).toBeCloseTo(2_451_544.5, 1);
  });

  it('gives the correct JD for 2024-06-21 (summer solstice)', () => {
    // JD 2 460 482.5 for 2024-06-21 midnight
    const jd = toJulianDay(Temporal.PlainDate.from('2024-06-21'));
    expect(jd).toBeCloseTo(2_460_482.5, 1);
  });
});

describe('solarParams', () => {
  it('gives declination ≈ +23.4° near summer solstice (2024-06-21)', () => {
    const { dec } = computeSolarParams(Temporal.PlainDate.from('2024-06-21'));
    expect(toDeg(dec)).toBeCloseTo(23.4, 0);
  });

  it('gives declination ≈ −23.4° near winter solstice (2024-12-21)', () => {
    const { dec } = computeSolarParams(Temporal.PlainDate.from('2024-12-21'));
    expect(toDeg(dec)).toBeCloseTo(-23.4, 0);
  });

  it('gives declination ≈ 0° near spring equinox (2024-03-20)', () => {
    const { dec } = computeSolarParams(Temporal.PlainDate.from('2024-03-20'));
    expect(Math.abs(toDeg(dec))).toBeLessThan(1);
  });

  it('gives obliquity ≈ 23.44° for a contemporary date', () => {
    const { obliq } = computeSolarParams(Temporal.PlainDate.from('2024-01-01'));
    expect(toDeg(obliq)).toBeCloseTo(23.44, 1);
  });

  it('sinDec equals sin(dec)', () => {
    const { sinDec, dec } = computeSolarParams(
      Temporal.PlainDate.from('2024-06-21'),
    );
    expect(sinDec).toBeCloseTo(Math.sin(dec), 10);
  });

  it('M is in radians — reduced M has expected magnitude', () => {
    // M is an accumulated angle (not reduced), so its absolute value grows over
    // time. To verify that it's in radians (not degrees), reduce it to [0, 2π),
    // convert to degrees, and check the resulting angle is plausible for 2024-06-21.
    const { M } = computeSolarParams(Temporal.PlainDate.from('2024-06-21'));
    const Mmod = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const Mdeg = toDeg(Mmod);
    expect(Mdeg).toBeGreaterThan(150);
    expect(Mdeg).toBeLessThan(190);
  });

  it('L0 is in radians, reduced to [0, 2π)', () => {
    const { L0 } = computeSolarParams(Temporal.PlainDate.from('2024-06-21'));
    expect(L0).toBeGreaterThanOrEqual(0);
    expect(L0).toBeLessThan(2 * Math.PI);
  });
});
