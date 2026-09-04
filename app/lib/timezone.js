// App-wide day boundary: Hanoi (Asia/Ho_Chi_Minh, UTC+7, no DST) rather than server-local
// UTC — so the daily passcode and the stats day buckets roll over at Hanoi midnight.
const HANOI_TZ = 'Asia/Ho_Chi_Minh';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: HANOI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

// "YYYY-MM-DD" for the given instant, as a Hanoi calendar date.
export function hanoiDateString(date = new Date()) {
  return fmt.format(date);
}
