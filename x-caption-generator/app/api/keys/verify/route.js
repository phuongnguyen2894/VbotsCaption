import { getDailyPasscode } from '../../../../lib/passcode.js';
import { kvGet, kvSet } from '../../../../lib/kv.js';

const KEYS_STORE = 'xgen-api-keys';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function testKey(key) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );
    if (res.ok) return { status: 'valid' };
    if (res.status === 429) return { status: 'quota' };
    const data = await res.json().catch(() => ({}));
    return { status: 'invalid', error: data?.error?.message || `Error ${res.status}` };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

export async function POST(request) {
  const { passcode, keys } = await request.json();

  if (passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return Response.json({ error: 'No keys provided' }, { status: 400 });
  }

  if (keys.length > 100) {
    return Response.json({ error: 'Maximum 100 keys per batch' }, { status: 400 });
  }

  const existing = (await kvGet(KEYS_STORE)) || [];
  const existingSet = new Set(existing.map(k => k.key));

  // Verify in parallel batches of 5
  const results = [];
  for (let i = 0; i < keys.length; i += 5) {
    const batch = keys.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async ({ key, label }) => {
        if (existingSet.has(key)) return { key, label, status: 'duplicate' };
        const result = await testKey(key);
        return { key, label, ...result };
      })
    );
    results.push(...batchResults);
  }

  // Auto-add valid and quota-hit keys
  const toAdd = results.filter(r => r.status === 'valid' || r.status === 'quota');
  for (const k of toAdd) {
    if (!existingSet.has(k.key) && existing.length < 100) {
      existing.push({ id: genId(), key: k.key, label: k.label || `Key ${existing.length + 1}` });
      existingSet.add(k.key);
    }
  }
  if (toAdd.length > 0) await kvSet(KEYS_STORE, existing);

  return Response.json({ results, added: toAdd.length });
}
