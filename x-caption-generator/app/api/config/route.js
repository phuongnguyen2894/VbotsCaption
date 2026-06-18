import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';

const CONFIG_KEY = 'xgen-config-v1';
const DEFAULT_CONFIG = {
  topic: 'Praise Xman movie',
  tagsAndKeywords: 'Xman #movie',
  charLimit: 280,
};

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
