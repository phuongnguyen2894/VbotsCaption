// Daily passcode format: 1412 + DD (UTC date, zero-padded)
// e.g. June 18 → "141218", June 5 → "141205"
export function getDailyPasscode() {
  const day = new Date().getUTCDate().toString().padStart(2, '0');
  return `1412${day}`;
}
