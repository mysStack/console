export const TIME_UNITS = {
  m: 60,
  h: 3600,
  d: 86400,
} as const;

export type TimeUnit = keyof typeof TIME_UNITS;

export interface RelativeTimeValue {
  value: number;
  unit: TimeUnit;
  seconds: number;
}

export const RELATIVE_TIME_OPTIONS = [
  '5m',
  '10m',
  '15m',
  '30m',
  '1h',
  '6h',
  '12h',
  '1d',
  '3d',
  '7d',
];

export const CUSTOM_TIME_UNITS: TimeUnit[] = ['m', 'h', 'd'];

export function toSeconds(value: number, unit: TimeUnit): number {
  return value * TIME_UNITS[unit];
}

export function createRelativeTime(value: number, unit: TimeUnit): RelativeTimeValue {
  return {
    value,
    unit,
    seconds: toSeconds(value, unit),
  };
}

export function parseRelativeTime(raw: string): RelativeTimeValue {
  const matched = raw.match(/^(\d+)([mhd])$/);
  if (!matched) {
    return createRelativeTime(15, 'm');
  }
  return createRelativeTime(Number(matched[1]) || 15, matched[2] as TimeUnit);
}

export const LATEST_LINES_TIME: RelativeTimeValue = {
  value: 0,
  unit: 'm',
  seconds: 0,
};

export function isLatestLines(value: RelativeTimeValue) {
  return !value.seconds;
}

export const DEFAULT_RELATIVE_TIME = LATEST_LINES_TIME;
