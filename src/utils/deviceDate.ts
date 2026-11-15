/**
 * Authoritative Client Device Date Provider
 *
 * Extracts the user's real local device clock using local getFullYear, getMonth, and getDate.
 * Never uses toISOString() (which is UTC and causes day-off shifts).
 * Automatically resolves the device's IANA timezone.
 */

export interface DeviceToday {
  y: number;
  m: number;
  d: number;
  iso: string; // YYYY-MM-DD
  tz: string;  // e.g. "Asia/Kolkata", "America/Los_Angeles"
}

export function getDeviceToday(overrideDate?: Date): DeviceToday {
  const now = overrideDate instanceof Date ? overrideDate : new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  let tz = 'UTC';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    tz = 'UTC';
  }

  return { y, m, d, iso, tz };
}

export interface TheatricalDateInfo {
  dayOfWeek: string;
  dayOfWeekShort: string;
  day: number;
  dayPadded: string;
  month: string;
  monthShort: string;
  year: number;
  currentMonthBadge: string;
  formattedBadge: string;
  fullScheduleDate: string;
  isoDate: string;
}

export function getTheatricalDateInfo(deviceToday: DeviceToday = getDeviceToday()): TheatricalDateInfo {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Construct local midnight date from integers
  const localDate = new Date(deviceToday.y, deviceToday.m - 1, deviceToday.d);
  const dayOfWeek = daysOfWeek[localDate.getDay()];
  const dayOfWeekShort = dayOfWeek.slice(0, 3).toUpperCase();
  const dayPadded = String(deviceToday.d).padStart(2, '0');
  const monthName = fullMonths[deviceToday.m - 1];
  const monthShort = months[deviceToday.m - 1].toUpperCase();

  return {
    dayOfWeek,
    dayOfWeekShort,
    day: deviceToday.d,
    dayPadded,
    month: monthName,
    monthShort,
    year: deviceToday.y,
    currentMonthBadge: `${monthShort} ${deviceToday.y}`,
    formattedBadge: `${monthName.toUpperCase()} ${deviceToday.y}`,
    fullScheduleDate: `${dayOfWeek}, ${monthName} ${deviceToday.d}, ${deviceToday.y}`,
    isoDate: deviceToday.iso
  };
}
