import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';
import { CONFIG_KEY, DEFAULT_CONFIG } from '../../lib/config.js';

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
  return Response.json({ success: true });
}
