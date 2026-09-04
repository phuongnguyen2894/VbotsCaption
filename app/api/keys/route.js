import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';

function storeFor(provider) {
  return provider === 'gemini' ? 'gemini-keys' : 'groq-keys';
}

function mask(key) {
  if (!key || key.length < 12) return '••••••';
  return key.slice(0, 6) + '…' + key.slice(-4);
}

// List (masked) the Groq/Gemini key pool, or remove/clear keys. Auth via daily passcode.
export async function POST(request) {
  const { passcode, action, id, provider } = await request.json();
  if (passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const KEYS_STORE = storeFor(provider);
  let keys = (await kvGet(KEYS_STORE)) || [];

  if (action === 'remove' && id) {
    keys = keys.filter(k => k.id !== id);
    await kvSet(KEYS_STORE, keys);
  } else if (action === 'clear') {
    keys = [];
    await kvSet(KEYS_STORE, keys);
  }

  return Response.json({
    keys: keys.map(k => ({ id: k.id, label: k.label, masked: mask(k.key) })),
    total: keys.length,
  });
}
