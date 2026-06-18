// Shared KV helpers — falls back to in-memory store for local dev when KV isn't configured
const mem = {};

export async function kvGet(key) {
  try {
    const { kv } = await import('@vercel/kv');
    return await kv.get(key);
  } catch {
    return mem[key] ?? null;
  }
}

export async function kvSet(key, value) {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value);
  } catch {
    mem[key] = value;
  }
}
