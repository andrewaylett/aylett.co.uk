export interface Loc {
  name: string;
  lat: number;
  lng: number;
}

export const PRESET_LOCATIONS: Loc[] = [
  { name: 'Tranent, East Lothian', lat: 55.9432, lng: -2.9542 },
  { name: 'Harleston, Norfolk', lat: 52.4037, lng: 1.2987 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
  { name: 'Penzance, Cornwall', lat: 50.1186, lng: -5.537 },
  { name: 'Ulva Ferry', lat: 56.4806, lng: -6.1528 },
];

export const LOC_A = 'A' as const;
export const LOC_B = 'B' as const;
export type LocationRef = typeof LOC_A | typeof LOC_B;
