import { SHOP_CONFIG } from './config.ts';

export interface BookingInterval {
  startAt: Date;
  endAt: Date;
}

export interface AvailableSlot {
  startAt: Date;
  label: string;
}

// Convert a shop-local wall-clock time on `dateStr` (YYYY-MM-DD) to a UTC Date.
// local = UTC + offset, therefore UTC = local - offset.
function localToUtc(dateStr: string, localMinutes: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const localAsUtcMs = Date.UTC(y, m - 1, d, 0, 0) + localMinutes * 60_000;
  return new Date(localAsUtcMs - SHOP_CONFIG.utcOffsetMin * 60_000);
}

function labelFor(localMinutes: number): string {
  const hh = String(Math.floor(localMinutes / 60)).padStart(2, '0');
  const mm = String(localMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getAvailableSlots(
  dateStr: string,
  serviceDurationMin: number,
  existingBookings: BookingInterval[],
): AvailableSlot[] {
  const { openHour, closeHour, bays, slotStepMin } = SHOP_CONFIG;
  const openMin = openHour * 60;
  const closeMin = closeHour * 60;
  const slots: AvailableSlot[] = [];

  for (let startMin = openMin; startMin + serviceDurationMin <= closeMin; startMin += slotStepMin) {
    const startAt = localToUtc(dateStr, startMin);
    const endAt = localToUtc(dateStr, startMin + serviceDurationMin);
    const overlapping = existingBookings.filter(
      (b) => b.startAt < endAt && b.endAt > startAt,
    ).length;
    if (overlapping < bays) {
      slots.push({ startAt, label: labelFor(startMin) });
    }
  }

  return slots;
}
