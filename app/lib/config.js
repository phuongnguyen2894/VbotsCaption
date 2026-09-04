// Shared config KV key + default shape — imported by the config API and the generate
// route (which needs to read the admin-selected caption provider).
export const CONFIG_KEY = 'xgen-config-v1';

export const DEFAULT_CONFIG = {
  topic: 'Praise Xman movie',
  tagsAndKeywords: 'Xman #movie',
  charLimit: 280,
  provider: 'groq',
  geminiModel: 'gemini-2.5-flash',
};
