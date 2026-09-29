import { revalidatePath } from 'next/cache';
import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';
import { CONFIG_KEY, DEFAULT_CONFIG } from '../../lib/config.js';

// Public page blocks on this on every load — cache it so repeat visits skip the
// serverless cold start + KV round-trip instead of re-fetching every time. POST
// below busts the cache immediately so admin edits don't wait out the window.
export const revalidate = 30;

export async function GET() {
  const config = await kvGet(CONFIG_KEY);
  return Response.json(config || DEFAULT_CONFIG);
}

export async function POST(request) {
  const { passcode, config } = await request.json();
  if (passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Invalid passcode' }, { status: 401 });
  }
  await kvSet(CONFIG_KEY, config);
  revalidatePath('/api/config');
  return Response.json({ success: true });
}
