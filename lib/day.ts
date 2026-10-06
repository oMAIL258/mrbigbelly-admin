export const TZ = 'Asia/Bangkok';

/** 'YYYY-MM-DD' for an instant, in shop time, so a 10pm order lands on the right day. */
export const dayKey = (iso: string | number | Date) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

export const todayKey = () => dayKey(new Date());

/** The UTC instants a shop day spans. Bangkok is UTC+7 all year, with no DST. */
export function dayBounds(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, d, -7)).toISOString(),
    to: new Date(Date.UTC(y, m - 1, d + 1, -7)).toISOString(),
  };
}

export function shiftDay(key: string, by: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
}

/** 'วันนี้' / 'Yesterday' / 'อา. 5 ต.ค.', in whichever language is on. The two
 *  words that are not a date come from the caller's dictionary. */
export function dayLabel(key: string, lang: 'th' | 'en' = 'en', words?: { today: string; yesterday: string }) {
  if (key === todayKey()) return words?.today ?? 'Today';
  if (key === shiftDay(todayKey(), -1)) return words?.yesterday ?? 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

export const shopTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
