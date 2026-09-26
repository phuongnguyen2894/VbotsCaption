import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';
import { CONFIG_KEY, resolveGeminiModel } from '../../lib/config.js';

function storeFor(provider) {
  return provider === 'gemini' ? 'gemini-keys' : 'groq-keys';
}

function mask(key) {
  if (!key || key.length < 12) return '••••••';
  return key.slice(0, 6) + '…' + key.slice(-4);
}

// One real generation per key, same request shape the generate route uses, so a pass here
// means the key works for actual captions (not just that it authenticates).
const TEST_PROMPT = 'Viết một caption tiếng Việt ngắn về Ling và Orm, không emoji.';

async function testKey(provider, key, geminiModel) {
  const t = Date.now();
  try {
    const res = provider === 'gemini'
      ? await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: TEST_PROMPT }] }],
            generationConfig: { maxOutputTokens: 60, thinkingConfig: { thinkingLevel: 'minimal' } },
          }),
          signal: AbortSignal.timeout(15000),
        })
      : await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
            messages: [{ role: 'user', content: TEST_PROMPT }],
            max_tokens: 60,
            reasoning_effort: 'low',
          }),
          signal: AbortSignal.timeout(15000),
        });
    let note = '';
    if (!res.ok) note = ((await res.json().catch(() => ({}))).error?.message || '').slice(0, 100);
    return { status: res.status, ms: Date.now() - t, note };
  } catch (e) {
    return { status: 'error', ms: Date.now() - t, note: e.name === 'TimeoutError' ? 'timeout' : e.message };
  }
}

// List (masked) the Groq/Gemini key pool, or remove/clear keys. Auth via daily passcode.
export async function POST(request) {
  const { passcode, action, id, provider } = await request.json();
  if (passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const KEYS_STORE = storeFor(provider);
  let keys = (await kvGet(KEYS_STORE)) || [];

  // Full (unmasked) keys, passcode-gated — one per line so the file can be pasted back into "Add keys".
  if (action === 'export') {
    return Response.json({ keys: keys.map(k => k.key).filter(Boolean) });
  }

  // Live-test every stored key server-side; only masked keys and statuses leave the server.
  if (action === 'test') {
    const geminiModel = resolveGeminiModel((await kvGet(CONFIG_KEY))?.geminiModel);
    const results = await Promise.all(keys.map(async k => ({
      id: k.id, masked: mask(k.key), ...(await testKey(provider, k.key, geminiModel)),
    })));
    return Response.json({ results, model: provider === 'gemini' ? geminiModel : (process.env.GROQ_MODEL || 'openai/gpt-oss-20b') });
  }

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
