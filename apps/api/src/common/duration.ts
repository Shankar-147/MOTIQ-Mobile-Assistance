const UNIT_TO_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/** Parses ".env"-style durations like "15m" or "30d" into whole seconds. */
export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${value}" — expected a number followed by s/m/h/d, e.g. "15m"`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_SECONDS[unit];
}
