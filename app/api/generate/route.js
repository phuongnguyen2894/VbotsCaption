export const maxDuration = 60;

import { after } from 'next/server';
import { kvGet, kvSet } from '../../lib/kv.js';
import { CONFIG_KEY } from '../../lib/config.js';
import { hanoiDateString } from '../../lib/timezone.js';

function normTopic(t) {
  if (!t || typeof t === 'number') return { captions: t || 0, users: [] };
  return t;
}

async function trackGeneration(ip, topicLabel) {
  const today = hanoiDateString();
  const dayKey = `stats:day:${today}`;
  const [dayData, allUsers, allTopics] = await Promise.all([
    kvGet(dayKey),
    kvGet('stats:all-users'),
    kvGet('stats:topics'),
  ]);
  const day = dayData || { captions: 0, users: [], topics: {} };
  if (!day.topics) day.topics = {};
  const all = allUsers || [];
  const topics = allTopics || {};
  day.captions += 1;
  if (!day.users.includes(ip)) day.users.push(ip);
  if (!all.includes(ip)) all.push(ip);
  if (topicLabel) {
    const dt = normTopic(day.topics[topicLabel]);
    dt.captions += 1;
    if (!dt.users.includes(ip)) dt.users.push(ip);
    day.topics[topicLabel] = dt;

    const at = normTopic(topics[topicLabel]);
    at.captions += 1;
    if (!at.users.includes(ip)) at.users.push(ip);
    at.lastAt = new Date().toISOString();
    topics[topicLabel] = at;
  }
  await Promise.all([kvSet(dayKey, day), kvSet('stats:all-users', all), kvSet('stats:topics', topics)]);
}

function stripHashtags(text) {
  return text.replace(/#\S+/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Remove emojis/pictographs the models like to add despite instructions.
function stripEmojis(text) {
  return (text || '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim();
}

// Always refer to them by short names — collapse full/birth names to Ling / Orm.
function shortenNames(text) {
  return (text || '')
    .replace(/\bLingling Kwong\b/gi, 'Ling')
    .replace(/\bSirilak Kwong\b/gi, 'Ling')
    .replace(/\bOrm Kornnaphat\b/gi, 'Orm')
    .replace(/\bKornnaphat Sethratanapong\b/gi, 'Orm')
    .replace(/\bLingling\b/gi, 'Ling')
    .replace(/\b(?:Kornnaphat|Sethratanapong)\b/gi, 'Orm')
    .replace(/\b(?:Sirilak|Kwong)\b/gi, 'Ling')
    // never a pronoun/title directly before the names — keep them bare
    .replace(/(?<=^|[\s.,!?:;"'(])(?:cô ấy|cô nàng|nàng thơ|cô|nàng|chị|bạn ấy)\s+(?=Ling|Orm)/gi, '')
    .replace(/\b(?:miss|ms\.?|mrs\.?)\s+(?=Ling|Orm)/gi, '')
    .replace(/\bLing(?:\s+Ling)+\b/gi, 'Ling') // collapse accidental duplicates
    .replace(/\bOrm(?:\s+Orm)+\b/gi, 'Orm')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Remove any non-Latin script the model drifts into (Chinese, Cyrillic, Greek, Thai…)
// plus CJK/fullwidth punctuation. Keeps Latin letters + Vietnamese diacritics (all Latin
// script), digits, and normal punctuation. Replaces with a space to avoid joining words.
function stripForeignScripts(text) {
  return (text || '')
    .replace(/\p{L}/gu, (ch) => (/\p{Script=Latin}/u.test(ch) ? ch : ' '))
    .replace(/[　-〿＀-￯]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim();
}

// Terminal punctuation, optionally followed by a closing quote/bracket and — when emojis
// are allowed — trailing emoji(s) the model tacked on after the punctuation.
const TERMINAL_TAIL_RE = /[.!?…]['"”’)\]]*[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]*$/u;

// Drop a trailing fragment left when num_predict cuts the model off mid-sentence.
// vn-caption's training captions always end in terminal punctuation, so a caption
// that doesn't is truncated — trim back to the last complete sentence.
function dropPartialSentence(text) {
  text = (text || '').trim();
  if (!text) return text;
  // Already ends cleanly (terminal punctuation, optionally closing quote/bracket/emoji).
  if (TERMINAL_TAIL_RE.test(text)) return text;
  // Cut back to the last terminator, as long as enough caption remains.
  const m = text.match(/^[\s\S]*[.!?…]['"”’)\]]*/u);
  if (m && m[0].trim().length >= Math.min(24, text.length)) return m[0].trim();
  return text; // single unpunctuated phrase — leave it
}

// A caption that doesn't end in terminal punctuation is almost certainly truncated
// (or had a Chinese tail stripped), so we treat it as incomplete and retry.
function endsComplete(text) {
  return TERMINAL_TAIL_RE.test((text || '').trim());
}

// Ling & Orm are both women — reject male pronouns/words so we regenerate or fall to Groq.
function hasMaleWords(text, lang) {
  const t = text || '';
  if (/\b(he|him|his|himself|man|men|male|boy|boys|guy|guys|gentleman|gentlemen|boyfriend|husband|brother|king|prince|mr)\b/i.test(t)) return true;
  if (lang === 'vi' && /(chàng|anh ấy|anh ta|ông ấy|bạn trai|nam nhân|đàn ông)/i.test(t)) return true;
  return false;
}

// Small models ignore the char limit, so enforce it here. Keep whole sentences
// that fit; if even the first sentence is too long, cut at a word boundary.
function trimToLimit(text, limit) {
  text = (text || '').trim();
  if (!limit || text.length <= limit) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+[\s]*|[^.!?…]+$/gu) || [text];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length <= limit) out += s;
    else break;
  }
  out = out.trim();
  if (out) return out;
  // First sentence alone exceeds the limit — hard cut without splitting an emoji surrogate pair.
  let cut = text.slice(0, limit);
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > limit * 0.5) cut = cut.slice(0, lastSpace);
  return cut.trim();
}

// A 429 almost always means the key's daily quota is gone, not a brief per-minute
// throttle — so a key found exhausted is skip-listed for a full day before retrying it.
const EXHAUSTED_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Merge newly-discovered cooldowns into the KV skip list and prune expired entries.
async function persistSkips(skipStore, newSkips) {
  try {
    const cur = (await kvGet(skipStore)) || {};
    const now = Date.now();
    const merged = {};
    for (const [id, t] of Object.entries({ ...cur, ...newSkips })) {
      if (t > now) merged[id] = t; // keep only still-active cooldowns
    }
    await kvSet(skipStore, merged);
  } catch {
    // best-effort cache; ignore failures
  }
}

// Remember which key last worked so subsequent requests stick to it instead of
// re-shuffling the whole pool every time — keeps hammering one key until it actually
// runs out (rate-limited/bad), only then does the pool get reshuffled for a replacement.
async function persistLastGood(store, id) {
  try {
    await kvSet(store, id);
  } catch {
    // best-effort cache; ignore failures
  }
}

async function callGroqWithKey(prompt, model, apiKey, timeoutMs = 7000) {
  // Abort a slow/hanging key so it rotates instead of blocking the request.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const groqModel = model || process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.9,
        // gpt-oss models spend most of the token budget on hidden reasoning by default,
        // leaving nothing for the actual caption — cap it so real output comes back.
        ...(groqModel.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
      }),
      signal: ctrl.signal,
    });
    if (res.status === 429) {
      const err = new Error('rate_limited');
      err.cooldownMs = EXHAUSTED_COOLDOWN_MS; // exhausted — skip this key for a full day
      throw err;
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error(`groq_${res.status}`);
      err.cooldownMs = 5 * 60 * 1000; // bad/forbidden key — rest it for 5 min
      throw err;
    }
    if (!res.ok) throw new Error(`groq_${res.status}`); // transient (5xx) — rotate, don't skip-list
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || '';
    if (!raw) throw new Error('groq_empty'); // empty response → try another key
    return stripHashtags(raw);
  } finally {
    clearTimeout(timer);
  }
}

// Rotate across a provider's key pool, skipping keys cached as rate-limited (KV skip list).
// Sticks to the last-known-good key first — only falls through to a (randomized) shuffle
// of the rest of the pool once that key actually fails. A failure rotates; rate-limited/bad
// keys get added to the skip list with their reset time, so future requests jump straight
// to live keys. `skip`/`lastGoodId` are pre-fetched by the caller (in parallel with
// everything else) so this never blocks on its own KV round-trip.
async function callProviderRotating(prompt, model, pool, callFn, skip, skipStore, lastGoodId, lastGoodStore) {
  if (!pool || !pool.length) throw new Error('no_keys');
  const now = Date.now();
  const live = pool.filter(k => !(skip[k.id] > now));
  const cooling = pool.filter(k => skip[k.id] > now);
  // Prefer the sticky last-good key if it's still live; only shuffle the rest as backup.
  const sticky = lastGoodId ? live.find(k => k.id === lastGoodId) : null;
  const restLive = sticky ? live.filter(k => k.id !== lastGoodId) : live;
  const order = (sticky ? [sticky] : []).concat(shuffle(restLive)).concat(shuffle(cooling));

  const deadline = Date.now() + 6000; // bound total time, leave room for the secondary provider
  const newSkips = {};
  let lastErr;
  let result;
  let got = false;
  let goodId = null;
  for (const k of order) {
    if (Date.now() > deadline) break;
    try {
      result = await callFn(prompt, model, k.key);
      got = true;
      goodId = k.id;
      break;
    } catch (e) {
      lastErr = e;
      if (e.cooldownMs) newSkips[k.id] = Date.now() + e.cooldownMs; // remember it's exhausted
    }
  }
  if (Object.keys(newSkips).length) {
    Object.assign(skip, newSkips); // reflect immediately so a retry within this request sees it too
    // Scheduled via after(): runs post-response but the platform guarantees it actually
    // completes, unlike a bare fire-and-forget promise which can get killed mid-flight
    // once the response is sent — which was silently dropping these writes.
    after(() => persistSkips(skipStore, newSkips).catch(() => {}));
  }
  if (got) {
    if (goodId !== lastGoodId) after(() => persistLastGood(lastGoodStore, goodId).catch(() => {}));
    return result;
  }
  throw lastErr || new Error('all_keys_failed');
}

// Gemini spends part of maxOutputTokens on hidden reasoning before the real answer unless
// told otherwise — same tax we already strip from Groq's gpt-oss models. 2.5-series models
// accept a numeric budget (0 = fully off); 3.x models only accept a level and can't go below
// "minimal", so there's nothing to save there, but setting it explicitly costs nothing.
function thinkingConfigFor(model) {
  if (model.startsWith('gemini-2.')) return { thinkingBudget: 0 };
  if (model.startsWith('gemini-3.')) return { thinkingLevel: 'minimal' };
  return undefined;
}

async function callGeminiWithKey(prompt, model, apiKey, timeoutMs = 7000, maxOutputTokens = 200) {
  // Abort a slow/hanging key so it rotates instead of blocking the request.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const thinkingConfig = thinkingConfigFor(model);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens, ...(thinkingConfig ? { thinkingConfig } : {}) },
      }),
      signal: ctrl.signal,
    });
    if (res.status === 429) {
      const err = new Error('rate_limited');
      err.cooldownMs = EXHAUSTED_COOLDOWN_MS; // exhausted — skip this key for a full day
      throw err;
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error(`gemini_${res.status}`);
      err.cooldownMs = 5 * 60 * 1000; // bad/forbidden key — rest it for 5 min
      throw err;
    }
    if (!res.ok) throw new Error(`gemini_${res.status}`); // transient (5xx) — rotate, don't skip-list
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || '';
    if (!raw) throw new Error('gemini_empty'); // empty/blocked response → try another key
    return stripHashtags(raw);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           || request.headers.get('x-real-ip')
           || 'unknown';

  const { topic, tagsAndKeywords, charLimit, topicLabel, language, allowEmojis } = await request.json();

  if (!topic?.trim()) {
    return Response.json({ error: 'Topic is required' }, { status: 400 });
  }

  // Per-topic language: explicit config wins; otherwise auto-detect from the topic text.
  const lang = language === 'en' || language === 'vi'
    ? language
    : (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(topic) ? 'vi' : 'en');

  const tagsLine = tagsAndKeywords?.trim()
    ? `\nKeywords & hashtags (do NOT include in the caption itself): ${tagsAndKeywords}`
    : '';

  const limit = charLimit || 280;

  // Force the output language — the English rules block otherwise makes small models drift.
  const langLine = lang === 'vi'
    ? '\n\nQUAN TRỌNG: BẮT BUỘC viết caption hoàn toàn bằng tiếng Việt tự nhiên. Tuyệt đối không dùng tiếng Anh.'
    : '\n\nIMPORTANT: Write the caption entirely in natural English. Do not use any other language.';

  // Length emphasis last (recency) — small models obey the final instruction best.
  const lengthLine = lang === 'vi'
    ? `\n\nĐỘ DÀI: Tối đa ${limit} ký tự. Chỉ viết 1-2 câu ngắn gọn, súc tích. Tuyệt đối KHÔNG viết dài dòng.`
    : `\n\nLENGTH: Hard maximum ${limit} characters. Write only 1-2 short, punchy sentences. Do NOT ramble.`;

  // Token budget: enough to finish 2-3 sentences near the char limit (Vietnamese is
  // ~0.75 tokens/char). trimToLimit + dropPartialSentence still guarantee the cap.
  const numPredict = Math.max(96, Math.ceil(limit * 0.9));

  // The topic can explicitly ask for a full/birth name (e.g. "Lingling Kwong") — when it
  // does, respect that instead of forcing the short form, both in the instruction given to
  // the model and in the post-processing cleanup below.
  const fullNameRe = /\b(Lingling\s+Kwong|Sirilak\s+Kwong|Orm\s+Kornnaphat|Kornnaphat\s+Sethratanapong)\b/i;
  const wantsFullName = fullNameRe.test(topic);

  const nameRuleEn = wantsFullName
    ? 'Use the exact name(s) given in the topic below, including any full name — do not shorten them.'
    : 'ALWAYS use just the short names "Ling" and "Orm" — never full names and never a pronoun/title before them (write "Ling", not "Miss Ling" or "she Ling").';
  const nameRuleVi = wantsFullName
    ? 'Dùng đúng tên như trong chủ đề bên dưới, kể cả tên đầy đủ — KHÔNG rút gọn.'
    : 'LUÔN gọi ngắn gọn là "Ling" và "Orm" — KHÔNG dùng tên đầy đủ và KHÔNG thêm đại từ/danh xưng trước tên (viết thẳng "Ling", "Orm"; KHÔNG viết "cô Ling", "nàng Orm").';

  // Core identity only, so the model knows who they are without being primed to name
  // brands/shows.
  const contextLine = lang === 'vi'
    ? `Thông tin nền: "Ling" và "Orm" là HAI nữ diễn viên Thái Lan, một cặp đôi màn ảnh. ${nameRuleVi} Cả hai đều là nữ — chỉ dùng đại từ nữ ("họ"); TUYỆT ĐỐI không dùng "anh", "chàng", "ông" hay bất kỳ từ nào chỉ nam giới. TUYỆT ĐỐI KHÔNG nhắc đến thương hiệu (ví dụ Dior) hay tên phim/series nào, trừ khi chủ đề bên dưới có nói rõ.\n\n`
    : `Background: "Ling" and "Orm" are TWO Thai actresses, an on-screen couple. ${nameRuleEn} Both are women — use ONLY female pronouns (she/her/they); NEVER use he/him/his or any male word. NEVER mention any brand (e.g. Dior) or any series/show title unless the topic below explicitly names it.\n\n`;

  // Emojis are opt-in per topic — default stays text-only so existing topics don't change
  // behavior; when a topic allows it, ask for a couple of fitting emojis instead of none.
  const emojiRule = allowEmojis
    ? (lang === 'vi'
      ? 'Có thể thêm 1-2 emoji phù hợp với nội dung nếu tự nhiên (không bắt buộc, không lạm dụng).'
      : 'You may add 1-2 emojis that genuinely fit the content if it feels natural — do not force them or overuse them.')
    : (lang === 'vi' ? 'Không dùng emoji.' : 'No emojis.');

  const prompt = `${contextLine}Generate 1 X (Twitter) post caption about: "${topic}"
Tone: Admiring${tagsLine}
Keep it punchy and share-worthy. No hashtags. ${emojiRule} Return ONLY the caption text.${langLine}${lengthLine}`;

  const clean = (c) => {
    const withoutEmojis = allowEmojis ? c : stripEmojis(c);
    return dropPartialSentence(trimToLimit(stripForeignScripts(wantsFullName ? withoutEmojis : shortenNames(withoutEmojis)), limit));
  };
  // A caption is "good" only if it's complete AND uses no male words (they're two women).
  const isGood = (c) => endsComplete(c) && !hasMaleWords(c, lang);

  // Admin picks the starting cloud provider (Groq or Gemini) in /admin → Configuration;
  // that's only the tie-breaker used until a provider has actually succeeded (see below).
  // Fetch config + both providers' key pools + skip lists all in parallel up front — these
  // are 5 independent KV reads that were previously done as sequential round-trips, adding
  // up to real latency before the first Groq/Gemini call was even made.
  const [cfg, groqKeysRaw, groqSkip, geminiKeysRaw, geminiSkip, groqLastGood, geminiLastGood, activeProvider] = await Promise.all([
    kvGet(CONFIG_KEY),
    kvGet('groq-keys'),
    kvGet('groq-skip'),
    kvGet('gemini-keys'),
    kvGet('gemini-skip'),
    kvGet('groq-lastgood'),
    kvGet('gemini-lastgood'),
    kvGet('active-provider'),
  ]);
  // Whichever provider most recently produced a caption is tried first — self-healing:
  // once one is exhausted the other takes over, and it flips back the moment the
  // original recovers, without needing the admin to flip the config by hand.
  // Falls back to the admin's configured preference until a provider has ever succeeded.
  const configured = cfg?.provider === 'gemini' ? 'gemini' : 'groq';
  const primary = (activeProvider === 'groq' || activeProvider === 'gemini') ? activeProvider : configured;

  const providers = {
    gemini: {
      name: 'Gemini',
      keysRaw: geminiKeysRaw,
      skip: geminiSkip || {},
      skipStore: 'gemini-skip',
      lastGoodId: geminiLastGood || null,
      lastGoodStore: 'gemini-lastgood',
      envKey: (process.env.GEMINI_API_KEY || '').replace(/^﻿/, ''),
      model: cfg?.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      callFn: (p, m, k) => callGeminiWithKey(p, m, k, 2600, numPredict),
    },
    groq: {
      name: 'Groq',
      keysRaw: groqKeysRaw,
      skip: groqSkip || {},
      skipStore: 'groq-skip',
      lastGoodId: groqLastGood || null,
      lastGoodStore: 'groq-lastgood',
      envKey: (process.env.GROQ_API_KEY || '').replace(/^﻿/, ''),
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      callFn: (p, m, k) => callGroqWithKey(p, m, k, 2600),
    },
  };

  // Cascade: whichever provider is currently active, then the other cloud provider.
  const secondary = primary === 'gemini' ? 'groq' : 'gemini';
  const cascade = [[primary, providers[primary]], [secondary, providers[secondary]]];

  let caption = '';
  let good = false;
  let wonBy = null;

  for (const [name, p] of cascade) {
    if (good) break;
    const storedKeys = p.keysRaw || [];
    let pool = storedKeys.filter(k => k.key).map(k => ({ id: k.id, key: k.key }));
    if (!pool.length && p.envKey) pool = [{ id: 'env', key: p.envKey }];
    if (!pool.length) continue; // no keys configured for this provider — try the next tier

    try {
      for (let i = 0; i < 2; i++) {
        const c = clean(await callProviderRotating(prompt, p.model, pool, p.callFn, p.skip, p.skipStore, p.lastGoodId, p.lastGoodStore));
        if (!caption) caption = c; // keep first as a fallback
        if (isGood(c)) { caption = c; good = true; wonBy = name; break; }
      }
    } catch {
      // this provider's whole pool is exhausted/unreachable — fall through to the next tier
    }
  }

  if (!caption) {
    return Response.json(
      { error: `All providers unavailable (${providers[primary].name}, ${providers[secondary].name}).` },
      { status: 503 }
    );
  }

  // Flip the active provider so the next request goes straight to whichever just worked.
  if (wonBy && wonBy !== activeProvider) after(() => kvSet('active-provider', wonBy).catch(() => {}));

  after(() => trackGeneration(ip, topicLabel).catch(() => {}));
  return Response.json({ caption });
}
