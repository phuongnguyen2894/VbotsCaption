// Last-resort caption when every Groq and Gemini key has failed. Assembled from small word
// lists (hook + name + action + vibe + ending) so users still get a clean caption instead of
// an error. Always English, whatever language the topic uses. Deliberately generic: no brand
// or show names, and only female wording, since Lingling Kwong and Orm Kornnaphat are both
// women. Always full names, never "Ling"/"Orm". Singular and plural action forms are kept
// separate for one person vs a duo.

const EN = {
  hooks: [
    'In every frame,',
    'Once again,',
    'Under the brightest lights,',
    'Effortlessly,',
    'With just one look,',
    'In this unforgettable moment,',
    'Right where every eye turns,',
    'Without even trying,',
  ],
  actionsSingular: ['shines', 'steals every glance', 'lights up the room', 'captures every heart'],
  actionsPlural: ['shine', 'steal every glance', 'light up the room', 'capture every heart'],
  vibes: ['graceful', 'radiant', 'effortless', 'timeless', 'elegant', 'captivating', 'sweet', 'magnetic'],
  endings: [
    'Impossible not to adore.',
    "Fans can't look away.",
    'Pure magic on screen.',
    'Simply unforgettable.',
    'Beautiful down to every detail.',
    'Never gets old.',
  ],
  duo: 'Lingling Kwong and Orm Kornnaphat',
};

const EMOJIS = ['✨', '💖', '🌸', '🤍'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Who the topic is about: only Ling, only Orm, or (default) both. Topics sometimes spell
// out full/birth names ("Lingling Kwong", "Orm Kornnaphat", or even "OrmKornnaphat" with no
// space) instead of the bare short names, so match on any of their name parts.
function subjectFor(topic) {
  const t = topic || '';
  const hasLing = /\bling\b|\blingling\b|\bkwong\b|\bsirilak\b/i.test(t);
  const hasOrm = /\borm\b|\bkornnaphat\b|\bsethratanapong\b/i.test(t);
  if (hasLing && !hasOrm) return { name: 'Lingling Kwong', isDuo: false };
  if (hasOrm && !hasLing) return { name: 'Orm Kornnaphat', isDuo: false };
  return { name: null, isDuo: true };
}

export function makeFallbackCaption({ topic, limit, allowEmojis }) {
  const { name: single, isDuo } = subjectFor(topic);
  const maxLen = limit || 280;

  const name = isDuo ? EN.duo : single;
  const hook = pick(EN.hooks);
  const i = Math.floor(Math.random() * EN.actionsSingular.length);
  const action = (isDuo ? EN.actionsPlural : EN.actionsSingular)[i];
  const body = `${name} ${action} with ${pick(EN.vibes)} charm.`;
  const ending = pick(EN.endings);

  // Shed the optional parts until it fits: ending first, then the hook.
  const emoji = allowEmojis ? ` ${pick(EMOJIS)}` : '';
  const attempts = [
    `${hook} ${body} ${ending}${emoji}`,
    `${hook} ${body}${emoji}`,
    `${body}${emoji}`,
    body,
  ];
  return attempts.find(a => a.length <= maxLen) || body;
}
