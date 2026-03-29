import { describe, expect, it } from '@jest/globals';
import { Temporal } from 'temporal-polyfill';

import { solarTimes } from '@/app/tools/sun/solarTimes';

const d = (s: string) => Temporal.PlainDate.from(s);

// Sunrise/sunset values computed from the NOAA/Meeus algorithm for London.
const LONDON = { lat: 51.5, lng: -0.1 };

describe('solarTimes', () => {
  it('returns polar night for Tromsø in December', () => {
    // 69.6°N — well above Arctic Circle; sun does not rise in mid-December
    const result = solarTimes(d('2024-12-21'), 69.6, 18.95);
    expect(result.polar).toBe('polar night');
  });

  it('returns midnight sun for Tromsø in June', () => {
    // Sun does not set in mid-June at 69.6°N
    const result = solarTimes(d('2024-06-21'), 69.6, 18.95);
    expect(result.polar).toBe('midnight sun');
  });

  describe('London, spring equinox 2024-03-20', () => {
    // Algorithm gives: sunrise 363 (06:03 GMT), sunset 1093 (18:13 GMT)
    const result = solarTimes(d('2024-03-20'), LONDON.lat, LONDON.lng);

    it('returns sunrise and sunset, not a polar result', () => {
      expect(result.polar).toBeUndefined();
      expect(result.sunrise).toBeDefined();
      expect(result.sunset).toBeDefined();
    });

    it('sunrise is within 2 minutes of 363 min (06:03 GMT)', () => {
      expect(result.sunrise).toBeGreaterThanOrEqual(361);
      expect(result.sunrise).toBeLessThanOrEqual(365);
    });

    it('sunset is within 2 minutes of 1093 min (18:13 GMT)', () => {
      expect(result.sunset).toBeGreaterThanOrEqual(1091);
      expect(result.sunset).toBeLessThanOrEqual(1095);
    });

    it('dayLength is approximately 12 hours', () => {
      expect(result.dayLength).toBeGreaterThanOrEqual(725);
      expect(result.dayLength).toBeLessThanOrEqual(735);
    });
  });

  describe('London, summer solstice 2024-06-21', () => {
    // Algorithm gives: sunrise 283 (04:43 BST), sunset 1281 (21:21 BST)
    const result = solarTimes(d('2024-06-21'), LONDON.lat, LONDON.lng);

    it('sunrise is within 2 minutes of 283 min (04:43 BST)', () => {
      expect(result.sunrise).toBeGreaterThanOrEqual(281);
      expect(result.sunrise).toBeLessThanOrEqual(285);
    });

    it('sunset is within 2 minutes of 1281 min (21:21 BST)', () => {
      expect(result.sunset).toBeGreaterThanOrEqual(1279);
      expect(result.sunset).toBeLessThanOrEqual(1283);
    });
  });

  describe('London, winter solstice 2024-12-21', () => {
    // Algorithm gives: sunrise 484 (08:04 GMT), sunset 953 (15:53 GMT)
    const result = solarTimes(d('2024-12-21'), LONDON.lat, LONDON.lng);

    it('sunrise is within 2 minutes of 484 min (08:04 GMT)', () => {
      expect(result.sunrise).toBeGreaterThanOrEqual(482);
      expect(result.sunrise).toBeLessThanOrEqual(486);
    });

    it('sunset is within 2 minutes of 953 min (15:53 GMT)', () => {
      expect(result.sunset).toBeGreaterThanOrEqual(951);
      expect(result.sunset).toBeLessThanOrEqual(955);
    });
  });

  it('civil dawn is before sunrise and civil dusk is after sunset', () => {
    const result = solarTimes(d('2024-06-21'), LONDON.lat, LONDON.lng);
    const { dawn, dusk, sunrise, sunset } = result;
    expect(dawn).toBeDefined();
    expect(dusk).toBeDefined();
    expect(sunrise).toBeDefined();
    expect(sunset).toBeDefined();
    // Sentinels ensure the comparisons fail clearly if values are undefined
    expect(dawn ?? Infinity).toBeLessThan(sunrise ?? Infinity);
    expect(dusk ?? -Infinity).toBeGreaterThan(sunset ?? -Infinity);
  });
});
