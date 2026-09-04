export const maxDuration = 60;

import { kvGet, kvSet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';

const CREDS_KEY = 'x-creds';
const TARGETS_KEY = 'x-targets';
const SCHEDULE_KEY = 'x-schedule';

// Twitter's public web-app bearer token (same for all users, not secret)
const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I7wHoZeT38aA%3DUgnEfs3aKa1nJLso4Z7VSe6RwObGbIvT0IPdkGpVnICYPm0nXP';

function extractCt0(cookieString) {
  const m = (cookieString || '').match(/(?:^|;\s*)ct0=([^;]+)/);
  return m ? m[1].trim() : '';
}

// Accept either a raw cookie string or a "Copy as cURL" command pasted from DevTools
function parseCookieInput(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith('curl')) {
    // Extract -H 'cookie: ...' from cURL command
    const m = s.match(/-H\s+['"](?:C|c)ookie:\s*([^'"]+)['"]/i);
    return m ? m[1].trim() : null;
  }
  return s; // raw cookie string
}

function xHeaders(creds) {
  const ct0 = extractCt0(creds.cookieString);
  return {
    authorization: `Bearer ${BEARER}`,
    cookie: creds.cookieString,
    'x-csrf-token': ct0,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    origin: 'https://x.com',
    referer: 'https://x.com/',
  };
}

async function xVerify(creds) {
  const res = await fetch('https://x.com/i/api/1.1/account/settings.json', {
    headers: xHeaders(creds),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || `${res.status}`;
    throw new Error(`Invalid session (${msg}) — make sure you copied auth_token and ct0 from twitter.com cookies`);
  }
  return data; // { screen_name: '...' }
}

function requireCreds(creds) {
  if (!creds?.cookieString || !extractCt0(creds.cookieString)) {
    throw new Error('X credentials not set or missing ct0 — paste the full cookie string from x.com DevTools');
  }
}

async function safeJson(res) {
  const txt = await res.text().catch(() => '');
  try { return txt ? JSON.parse(txt) : null; } catch { return null; }
}

// Twitter web-app GraphQL query ID for CreateTweet (stable since late 2023)
const CREATE_TWEET_QID = 'SoVnbfCycZ7fERGCwpZkYA';

const TWEET_FEATURES = {
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  freedom_of_speech_not_reach_the_point_tweet_result_by_tweet_id_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_timeline_over_standard_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  interactive_text_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

async function xPost(creds, text, replyToId) {
  requireCreds(creds);
  const variables = {
    tweet_text: text,
    dark_request: false,
    media: { media_entities: [], possibly_sensitive: false },
    semantic_annotation_ids: [],
  };
  if (replyToId) variables.reply = { in_reply_to_tweet_id: replyToId, exclude_reply_user_ids: [] };

  const res = await fetch(`https://x.com/i/api/graphql/${CREATE_TWEET_QID}/CreateTweet`, {
    method: 'POST',
    headers: { ...xHeaders(creds), 'content-type': 'application/json' },
    body: JSON.stringify({ variables, features: TWEET_FEATURES, queryId: CREATE_TWEET_QID }),
  });
  const data = await safeJson(res);
  const errMsg = data?.errors?.[0]?.message;
  if (!res.ok || errMsg) {
    // Include raw body snippet when no structured error available
    const detail = errMsg || (data ? JSON.stringify(data).slice(0, 120) : `${res.status}`);
    throw new Error(`Post failed: ${detail}`);
  }
  return data;
}

async function xLatestTweet(creds, username) {
  requireCreds(creds);
  const clean = username.replace(/^@/, '');
  const url = `https://x.com/i/api/1.1/statuses/user_timeline.json?screen_name=${clean}&count=10&exclude_replies=true&include_rts=false&tweet_mode=extended`;
  const res = await fetch(url, { headers: xHeaders(creds) });
  const tweets = await safeJson(res);
  if (!res.ok) throw new Error(`Timeline fetch failed (${res.status})`);
  if (!Array.isArray(tweets) || !tweets.length) throw new Error(`No tweets found for @${clean}`);
  const t = tweets[0];
  return { tweetId: t.id_str, text: t.full_text || t.text, url: `https://twitter.com/${clean}/status/${t.id_str}` };
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function extractTweetId(input) {
  const m = (input || '').match(/\/status\/(\d+)/);
  return m ? m[1] : input.replace(/\s/g, '');
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { passcode, action } = body;
  if (passcode !== getDailyPasscode()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return await handlePost(body, request);
  } catch (e) {
    return Response.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}

async function handlePost(body, request) {
  const { action } = body;

  if (action === 'get-state') {
    const [creds, targets, schedule] = await Promise.all([
      kvGet(CREDS_KEY), kvGet(TARGETS_KEY), kvGet(SCHEDULE_KEY),
    ]);
    return Response.json({
      creds: creds ? { configured: true } : null,
      targets: targets || [],
      schedule: schedule || null,
    });
  }

  if (action === 'save-creds') {
    const { cookieString } = body;
    const parsed = parseCookieInput(cookieString);
    if (!parsed) return Response.json({ error: 'Paste either the Cookie header value or a cURL command from x.com Network tab' }, { status: 400 });
    if (!extractCt0(parsed)) return Response.json({ error: 'Missing ct0 cookie — make sure you copied a request that goes to x.com (not an image or CDN request)' }, { status: 400 });
    await kvSet(CREDS_KEY, { cookieString: parsed });
    return Response.json({ ok: true });
  }

  if (action === 'save-schedule') {
    const { scheduledAt } = body;
    if (!scheduledAt) return Response.json({ error: 'scheduledAt required' }, { status: 400 });
    const existing = (await kvGet(SCHEDULE_KEY)) || {};
    await kvSet(SCHEDULE_KEY, { ...existing, scheduledAt, lastRunAt: existing.lastRunAt || null });
    return Response.json({ ok: true, scheduledAt });
  }

  if (action === 'clear-schedule') {
    await kvSet(SCHEDULE_KEY, null);
    return Response.json({ ok: true });
  }

  if (action === 'add-target') {
    const { tweetUrl, topicIdx, note } = body;
    const tweetId = extractTweetId(tweetUrl || '');
    if (!tweetId || !/^\d+$/.test(tweetId)) return Response.json({ error: 'Paste a valid tweet URL or numeric ID' }, { status: 400 });
    const targets = (await kvGet(TARGETS_KEY)) || [];
    if (targets.some(t => t.type !== 'account' && t.tweetId === tweetId)) return Response.json({ error: 'That tweet is already in the list' }, { status: 400 });
    targets.push({ id: genId(), type: 'tweet', tweetId, tweetUrl: tweetUrl || tweetId, topicIdx: topicIdx ?? 0, note: note || '', status: 'pending', addedAt: new Date().toISOString(), repliedAt: null });
    await kvSet(TARGETS_KEY, targets);
    return Response.json({ targets });
  }

  if (action === 'add-account') {
    const { username, topicIdx, note } = body;
    const clean = (username || '').replace(/^@/, '').trim();
    if (!clean) return Response.json({ error: 'Enter a username' }, { status: 400 });
    const targets = (await kvGet(TARGETS_KEY)) || [];
    if (targets.some(t => t.type === 'account' && t.username.toLowerCase() === clean.toLowerCase())) return Response.json({ error: `@${clean} already in the list` }, { status: 400 });
    targets.push({ id: genId(), type: 'account', username: clean, topicIdx: topicIdx ?? 0, note: note || '', status: 'active', addedAt: new Date().toISOString(), lastRepliedTweetId: null, lastRepliedAt: null });
    await kvSet(TARGETS_KEY, targets);
    return Response.json({ targets });
  }

  if (action === 'fetch-latest') {
    const { targetId } = body;
    const [creds, targets] = await Promise.all([kvGet(CREDS_KEY), kvGet(TARGETS_KEY)]);
    if (!creds) return Response.json({ error: 'X credentials not configured' }, { status: 400 });
    const target = (targets || []).find(t => t.id === targetId);
    if (!target || target.type !== 'account') return Response.json({ error: 'Account target not found' }, { status: 404 });
    try {
      const post = await xLatestTweet(creds, target.username);
      return Response.json({ post });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === 'toggle-account') {
    const { id } = body;
    const targets = ((await kvGet(TARGETS_KEY)) || []).map(t =>
      t.id === id && t.type === 'account' ? { ...t, status: t.status === 'paused' ? 'active' : 'paused' } : t
    );
    await kvSet(TARGETS_KEY, targets);
    return Response.json({ targets });
  }

  if (action === 'remove-target') {
    const targets = ((await kvGet(TARGETS_KEY)) || []).filter(t => t.id !== body.id);
    await kvSet(TARGETS_KEY, targets);
    return Response.json({ targets });
  }

  if (action === 'reset-target') {
    const targets = ((await kvGet(TARGETS_KEY)) || []).map(t =>
      t.id === body.id ? { ...t, status: 'pending', repliedAt: null } : t
    );
    await kvSet(TARGETS_KEY, targets);
    return Response.json({ targets });
  }

  if (action === 'post-tweet') {
    const { text } = body;
    if (!text?.trim()) return Response.json({ error: 'Caption is empty' }, { status: 400 });
    const creds = await kvGet(CREDS_KEY);
    if (!creds) return Response.json({ error: 'X credentials not configured' }, { status: 400 });
    try {
      await xPost(creds, text.trim());
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === 'reply-tweet') {
    const { text, targetId, tweetId: suppliedTweetId } = body;
    if (!text?.trim() || !targetId) return Response.json({ error: 'Missing text or targetId' }, { status: 400 });
    const [creds, targets] = await Promise.all([kvGet(CREDS_KEY), kvGet(TARGETS_KEY)]);
    if (!creds) return Response.json({ error: 'X credentials not configured' }, { status: 400 });
    const target = (targets || []).find(t => t.id === targetId);
    if (!target) return Response.json({ error: 'Target not found' }, { status: 404 });
    const replyToId = target.type === 'account' ? suppliedTweetId : target.tweetId;
    if (!replyToId) return Response.json({ error: 'No tweet ID to reply to' }, { status: 400 });
    try {
      await xPost(creds, text.trim(), replyToId);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    const now = new Date().toISOString();
    const updated = ((await kvGet(TARGETS_KEY)) || []).map(t => {
      if (t.id !== targetId) return t;
      return t.type === 'account' ? { ...t, lastRepliedTweetId: replyToId, lastRepliedAt: now } : { ...t, status: 'done', repliedAt: now };
    });
    await kvSet(TARGETS_KEY, updated);
    return Response.json({ ok: true, targets: updated });
  }

  if (action === 'run-auto') {
    const host = request.headers.get('host') || 'vbots-five.vercel.app';
    return Response.json(await runAutoPending(`https://${host}`));
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function runAutoPending(siteUrl) {
  const [creds, targets, cfg] = await Promise.all([
    kvGet(CREDS_KEY), kvGet(TARGETS_KEY), kvGet('xgen-config-v1'),
  ]);
  if (!creds) return { skipped: 'No X credentials configured' };
  const workable = (targets || []).filter(t =>
    (t.type === 'account' && t.status === 'active') || (t.type !== 'account' && t.status === 'pending')
  );
  if (!workable.length) return { processed: 0, results: [] };
  const topics = cfg?.topics || [];
  const results = [];
  const updatedTargets = [...(targets || [])];
  for (const target of workable) {
    try {
      let replyToId;
      if (target.type === 'account') {
        const post = await xLatestTweet(creds, target.username);
        if (post.tweetId === target.lastRepliedTweetId) { results.push({ id: target.id, skipped: `@${target.username} has no new posts` }); continue; }
        replyToId = post.tweetId;
      } else {
        replyToId = target.tweetId;
      }
      const topic = topics[target.topicIdx] || topics[0];
      if (!topic) { results.push({ id: target.id, error: 'No topic at index ' + target.topicIdx }); continue; }
      const genRes = await fetch(`${siteUrl}/api/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.topic, tagsAndKeywords: topic.tagsAndKeywords, language: topic.language || 'vi', charLimit: topic.charLimit || 250 }),
      });
      const { caption } = await genRes.json();
      if (!caption) { results.push({ id: target.id, error: 'Empty caption' }); continue; }
      await xPost(creds, caption, replyToId);
      const now = new Date().toISOString();
      const idx = updatedTargets.findIndex(t => t.id === target.id);
      if (idx !== -1) updatedTargets[idx] = target.type === 'account'
        ? { ...target, lastRepliedTweetId: replyToId, lastRepliedAt: now }
        : { ...target, status: 'done', repliedAt: now };
      results.push({ id: target.id, ok: true });
    } catch (e) {
      results.push({ id: target.id, error: e.message });
    }
  }
  if (results.some(r => r.ok)) await kvSet(TARGETS_KEY, updatedTargets);
  return { processed: workable.length, results };
}
