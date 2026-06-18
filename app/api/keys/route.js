import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';

const KEYS_STORE = 'xgen-api-keys';

function todayKey() {
  return `xgen-key-status-${new Date().toISOString().split('T')[0]}`;
}

function maskKey(key) {
  if (!key || key.length < 12) return '****';
  return key.slice(0, 8) + '••••' + key.slice(-4);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('passcode') !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = (await kvGet(KEYS_STORE)) || [];
  const status = (await kvGet(todayKey())) || {};
  const today = new Date().toISOString().split('T')[0];

  return Response.json({
    keys: keys.map((k, i) => ({
      id: k.id,
      label: k.label || `Key ${i + 1}`,
      masked: maskKey(k.key),
      exhausted: !!status[k.id],
    })),
    total: keys.length,
    available: keys.filter(k => !status[k.id]).length,
    date: today,
  });
}

export async function POST(request) {
  const body = await request.json();
  if (body.passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = (await kvGet(KEYS_STORE)) || [];

  if (body.action === 'add') {
    if (keys.length >= 100) return Response.json({ error: 'Maximum 100 keys reached' }, { status: 400 });
    const keyStr = body.key?.trim();
    if (!keyStr) return Response.json({ error: 'API key is required' }, { status: 400 });
    if (keys.some(k => k.key === keyStr)) return Response.json({ error: 'Key already exists' }, { status: 400 });
    keys.push({ id: genId(), key: keyStr, label: body.label?.trim() || `Key ${keys.length + 1}` });
    await kvSet(KEYS_STORE, keys);
    return Response.json({ success: true });
  }

  if (body.action === 'delete') {
    await kvSet(KEYS_STORE, keys.filter(k => k.id !== body.id));
    return Response.json({ success: true });
  }

  if (body.action === 'reset') {
    await kvSet(todayKey(), {});
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
