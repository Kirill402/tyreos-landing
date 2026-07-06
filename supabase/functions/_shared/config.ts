// Shop configuration for the single demo TYREOS tire shop.
// Europe/Moscow is a fixed UTC+3 offset (Russia has no DST), so we store the
// offset directly instead of depending on a timezone database. If the demo
// shop ever moves timezones, change utcOffsetMin here.
export const SHOP_CONFIG = {
  utcOffsetMin: 180, // Europe/Moscow, UTC+3
  openHour: 9, // shop opens 09:00 local
  closeHour: 21, // shop closes 21:00 local
  bays: 2, // number of concurrent work posts
  slotStepMin: 30, // booking slots start every 30 minutes
} as const;

export type ShopConfig = typeof SHOP_CONFIG;
