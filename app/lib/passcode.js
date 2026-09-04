import { hanoiDateString } from './timezone.js';

// Daily passcode format: 1412 + DD (Hanoi date, zero-padded)
// e.g. June 18 → "141218", June 5 → "141205"
export function getDailyPasscode() {
  const day = hanoiDateString().slice(-2);
  return `1412${day}`;
}
