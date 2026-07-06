import { SHOP_CONFIG } from './config.ts';

// Shop-local calendar date (YYYY-MM-DD) for a UTC instant. We shift the instant by the
// fixed offset and then read UTC fields, so the "wall clock" we read is the shop-local one.
export function shopLocalDateStr(now: Date): string {
  const local = new Date(now.getTime() + SHOP_CONFIG.utcOffsetMin * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The UTC half-open range covering one shop-local day (00:00 local .. 24:00 local).
export function shopDayRangeUtc(dateStr: string): { fromUtc: Date; toUtc: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const midnightLocalAsUtcMs = Date.UTC(y, m - 1, d, 0, 0);
  const fromUtc = new Date(midnightLocalAsUtcMs - SHOP_CONFIG.utcOffsetMin * 60_000);
  const toUtc = new Date(fromUtc.getTime() + 24 * 60 * 60_000);
  return { fromUtc, toUtc };
}
