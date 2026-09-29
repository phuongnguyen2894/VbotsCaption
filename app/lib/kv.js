// Shared KV helpers — falls back to in-memory store for local dev when KV isn't configured.
// In production KV reads/writes intermittently fail (transient Upstash/network errors) and
// were silently swallowed into the same fallback used for "not configured", which made real
// outages invisible and served an empty default config to users. Now: one retry before giving
// up, and the final failure is logged so it shows up in Vercel's function logs.
const mem = {};

async function withRetry(fn, label, key) {
  try {
    return await fn();
  } catch (e) {
    try {
      return await fn();
    } catch (e2) {
      console.error(`[kv] ${label} failed for "${key}" after retry:`, e2?.message || e2);
      throw e2;
    }
  }
}

export async function kvGet(key) {
  try {
    const { kv } = await import('@vercel/kv');
    return await withRetry(() => kv.get(key), 'get', key);
  } catch {
    return mem[key] ?? null;
  }
}

export async function kvSet(key, value) {
  try {
    const { kv } = await import('@vercel/kv');
    await withRetry(() => kv.set(key, value), 'set', key);
  } catch {
    mem[key] = value;
  }
}
