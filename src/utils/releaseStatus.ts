/**
 * Pure client-side release status and window validation.
 * Uses whole-day integer math: dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000).
 * Never compares using new Date('YYYY-MM-DD') or millisecond division.
 */

import { getDeviceToday, type DeviceToday } from './deviceDate';

export function parseYMD(dateStr: string | undefined | null): { y: number; m: number; d: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function toDayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function getDeviceTodayYMD(deviceToday: DeviceToday = getDeviceToday()): { y: number; m: number; d: number } {
  return {
    y: deviceToday.y,
    m: deviceToday.m,
    d: deviceToday.d
  };
}

export function getDeviceTodayStr(deviceToday: DeviceToday = getDeviceToday()): string {
  return deviceToday.iso;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Calculates human-readable release status from an ISO release date string and reference date.
 * Strictly outputs only:
 * - "Releasing in X days • date"
 * - "Releasing Today"
 * - "Released X days ago • Now in Theaters"
 */
export function computeReleaseStatus(releaseDateISO: string | undefined, refToday: DeviceToday | string = getDeviceToday()): string {
  const relYMD = parseYMD(releaseDateISO);
  if (!relYMD) return '';

  const todayYMD = typeof refToday === 'string'
    ? (parseYMD(refToday) || getDeviceTodayYMD())
    : { y: refToday.y, m: refToday.m, d: refToday.d };

  const relDay = toDayNumber(relYMD.y, relYMD.m, relYMD.d);
  const todayDay = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);
  const diffDays = relDay - todayDay;

  // Window check: [today - 20, today + 45]
  if (diffDays > 45 || diffDays < -20) return '';

  const formattedDate = `${String(relYMD.d).padStart(2, '0')} ${MONTHS[relYMD.m - 1]} ${relYMD.y}`;

  if (diffDays > 0) {
    return `Releasing in ${diffDays} day${diffDays === 1 ? '' : 's'} • ${formattedDate}`;
  } else if (diffDays === 0) {
    return 'Releasing Today';
  } else {
    const daysAgo = Math.abs(diffDays);
    return `Released ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago • Now in Theaters`;
  }
}

/**
 * Returns true if a movie with the given release date falls within the display window:
 * dayNumber(release) >= dayNumber(today) - 20 AND <= dayNumber(today) + 45
 */
export function isInDisplayWindow(releaseDateISO: string | undefined, refToday: DeviceToday | string = getDeviceToday()): boolean {
  const relYMD = parseYMD(releaseDateISO);
  if (!relYMD) return false;

  const todayYMD = typeof refToday === 'string'
    ? (parseYMD(refToday) || getDeviceTodayYMD())
    : { y: refToday.y, m: refToday.m, d: refToday.d };

  const relDay = toDayNumber(relYMD.y, relYMD.m, relYMD.d);
  const todayDay = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);

  return relDay >= todayDay - 20 && relDay <= todayDay + 45;
}
