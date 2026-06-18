import { kvGet, kvSet } from '../../lib/kv.js';

const KEYS_STORE = 'xgen-api-keys';

function todayKey() {
  return `xgen-key-status-${new Date().toISOString().split('T')[0]}`;
}

async function getAvailableKey() {
  const keys = (await kvGet(KEYS_STORE)) || [];
  if (!keys.length) return null;
  const status = (await kvGet(todayKey())) || {};
  return keys.find(k => !status[k.id]) || null;
}

async function markExhausted(id) {
  const sk = todayKey();
  const status = (await kvGet(sk)) || {};
  status[id] = true;
  await kvSet(sk, status);
}

async function callGemini(apiKey, prompt) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.9 },
      }),
    }
  );
}

export async function POST(request) {
  const { topic, tagsAndKeywords, charLimit } = await request.json();

  if (!topic?.trim()) {
    return Response.json({ error: 'Topic is required' }, { status: 400 });
  }

  const tagsLine = tagsAndKeywords?.trim()
    ? `\nKeywords & hashtags (do NOT include in the caption itself): ${tagsAndKeywords}`
    : '';

  const prompt = `Generate 1 X (Twitter) post caption about: "${topic}"
Tone: Inspirational${tagsLine}

Rules:
- Caption must be strictly under ${charLimit || 280} characters
- Do NOT include any hashtags or keywords in the caption text
- Make it punchy, engaging, and share-worthy
- Return ONLY the raw caption text — no quotes, no explanation, no JSON`;

  let keyObj = await getAvailableKey();

  if (!keyObj) {
    const envKey = process.env.GEMINI_API_KEY;
    if (!envKey) {
      return Response.json(
        { error: 'No API keys available. Add Gemini API keys in the admin panel.' },
        { status: 503 }
      );
    }
    keyObj = { id: '__env__', key: envKey };
  }

  while (keyObj) {
    const res = await callGemini(keyObj.key, prompt);

    if (res.status === 429) {
      if (keyObj.id !== '__env__') await markExhausted(keyObj.id);
      keyObj = await getAvailableKey();
      if (!keyObj) {
        return Response.json(
          { error: 'All API keys have hit their daily quota. Resets at midnight Pacific time.' },
          { status: 429 }
        );
      }
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err?.error?.message || `Gemini API error ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const caption = raw.replace(/^["']|["']$/g, '');
    return Response.json({ caption });
  }

  return Response.json({ error: 'No API keys available.' }, { status: 503 });
}
