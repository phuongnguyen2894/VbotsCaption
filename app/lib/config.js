// Shared config KV key + default shape — imported by the config API and the generate
// route (which needs to read the admin-selected caption provider).
export const CONFIG_KEY = 'xgen-config-v1';

// gemini-2.5-* is retired for Gemini keys (404 "no longer available"), so a stored setting
// naming one silently resolves to the default instead of failing every Gemini call.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const RETIRED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
export function resolveGeminiModel(model) {
  const m = (model || '').trim();
  return !m || RETIRED_GEMINI_MODELS.includes(m) ? DEFAULT_GEMINI_MODEL : m;
}

export const DEFAULT_CONFIG = {
  topic: 'Praise Xman movie',
  tagsAndKeywords: 'Xman #movie',
  charLimit: 280,
  provider: 'groq',
  geminiModel: DEFAULT_GEMINI_MODEL,
};
