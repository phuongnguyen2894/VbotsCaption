'use client';
import { useState, useEffect, useRef } from 'react';

const card = { background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '16px 18px' };
const secLabel = { fontSize: 11, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.09em' };

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => execCopy(text));
  }
  return Promise.resolve(execCopy(text));
}

function execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

function parseTagTokens(text) {
  if (!text?.trim()) return [];
  return text.trim().split(/\s+/).filter(Boolean).map(t => ({ label: t, isHt: t.startsWith('#') }));
}

function formatTagsText(text) {
  const tokens = parseTagTokens(text);
  if (!tokens.length) return '';
  const keywords = tokens.filter(t => !t.isHt).map(t => t.label);
  const hashtags = tokens.filter(t => t.isHt).map(t => t.label);
  return [keywords.join(' '), hashtags.join(' ')].filter(Boolean).join('\n');
}

const STRINGS = {
  en: {
    loading: 'Loading…', ready: n => `Admiring · max ${n} chars`, notConfigured: 'Not configured — contact your admin.',
    caption: 'Caption', tagsKeywords: 'Tags & Keywords', igTagsKeywords: 'Instagram Tags & Keywords',
    copied: '✓ Copied', copy: 'Copy', copyCaption: 'Copy caption', copyCaptionIg: 'Copy caption + IG tags', copyCaptionTags: 'Copy caption + tags',
    generating: 'Generating…', shuffle: '↺ Shuffle', shuffleBoth: '⤮ Shuffle caption & tags',
    genFailed: 'Generation failed.', reqFailed: 'Request failed: ', topic: 'Topic',
  },
  vi: {
    loading: 'Đang tải…', ready: n => `Admiring · tối đa ${n} ký tự`, notConfigured: 'Chưa được cấu hình — vui lòng liên hệ quản trị viên.',
    caption: 'Caption', tagsKeywords: 'Thẻ & Từ khóa', igTagsKeywords: 'Thẻ & Từ khóa Instagram',
    copied: '✓ Đã sao chép', copy: 'Sao chép', copyCaption: 'Sao chép caption', copyCaptionIg: 'Sao chép caption + thẻ IG', copyCaptionTags: 'Sao chép caption + thẻ',
    generating: 'Đang tạo…', shuffle: '↺ Xáo trộn', shuffleBoth: '⤮ Xáo trộn caption & thẻ',
    genFailed: 'Tạo caption thất bại.', reqFailed: 'Yêu cầu thất bại: ', topic: 'Chủ đề',
  },
};

// Keep keywords and the rest of the hashtags in place; shuffle only the first 3 hashtags.
function shuffleHashtags(text) {
  const tokens = parseTagTokens(text);
  const keywords = tokens.filter(t => !t.isHt).map(t => t.label);
  const hashtags = tokens.filter(t => t.isHt).map(t => t.label);
  const head = hashtags.slice(0, 3);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...keywords, ...head, ...hashtags.slice(3)].join(' ');
}

function CaptionCard({ caption, charLimit, tagsText, igTagsText, t }) {
  const [copiedCap, setCopiedCap] = useState(false);
  const [copiedIg, setCopiedIg] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);
  const n = caption.length;
  const over = n > charLimit;
  const pct = Math.min(n / charLimit, 1) * 100;
  const barColor = over ? '#ef4444' : n > charLimit * 0.85 ? '#f59e0b' : '#22c55e';

  const copyCap = () => copyText(caption).then(() => { setCopiedCap(true); setTimeout(() => setCopiedCap(false), 2000); });
  const copyIg = () => {
    const fmt = formatTagsText(igTagsText);
    copyText(fmt ? caption + '\n \n' + fmt : caption).then(() => { setCopiedIg(true); setTimeout(() => setCopiedIg(false), 2000); });
  };
  const copyBoth = () => {
    const fmt = formatTagsText(tagsText);
    copyText(fmt ? caption + '\n \n' + fmt : caption).then(() => { setCopiedBoth(true); setTimeout(() => setCopiedBoth(false), 2000); });
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={secLabel}>{t.caption}</span>
        <span style={{ fontSize: 12, color: over ? '#ef4444' : '#52525b', fontVariantNumeric: 'tabular-nums' }}>{n}/{charLimit}</span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.65, color: '#e4e4e7' }}>{caption}</p>
      <div style={{ height: 3, background: '#27272a', borderRadius: 100, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${pct.toFixed(1)}%`, height: '100%', background: barColor, borderRadius: 100 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copyCap} style={{ flex: 1, padding: '7px 0', background: copiedCap ? '#22c55e18' : 'transparent', border: `1px solid ${copiedCap ? '#22c55e50' : '#3f3f46'}`, borderRadius: 8, color: copiedCap ? '#22c55e' : '#a1a1aa', fontSize: 13 }}>
          {copiedCap ? t.copied : t.copyCaption}
        </button>
        {igTagsText && (
          <button onClick={copyIg} style={{ flex: 1, padding: '7px 0', background: copiedIg ? '#ec489918' : 'transparent', border: `1px solid ${copiedIg ? '#ec489950' : '#3f3f46'}`, borderRadius: 8, color: copiedIg ? '#f472b6' : '#a1a1aa', fontSize: 13 }}>
            {copiedIg ? t.copied : t.copyCaptionIg}
          </button>
        )}
        {tagsText && (
          <button onClick={copyBoth} style={{ flex: 1, padding: '7px 0', background: copiedBoth ? '#3b82f618' : 'transparent', border: `1px solid ${copiedBoth ? '#3b82f650' : '#3f3f46'}`, borderRadius: 8, color: copiedBoth ? '#60a5fa' : '#a1a1aa', fontSize: 13 }}>
            {copiedBoth ? t.copied : t.copyCaptionTags}
          </button>
        )}
      </div>
    </div>
  );
}

function TagsSection({ tagsAndKeywords, label, t }) {
  const [copied, setCopied] = useState(false);
  const tokens = parseTagTokens(tagsAndKeywords);
  if (!tokens.length) return null;
  const keywords = tokens.filter(t => !t.isHt);
  const hashtags = tokens.filter(t => t.isHt);
  const copy = () => copyText(formatTagsText(tagsAndKeywords)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={secLabel}>{label}</span>
        <button onClick={copy} style={{ padding: '4px 13px', background: copied ? '#22c55e18' : 'transparent', border: `1px solid ${copied ? '#22c55e50' : '#3f3f46'}`, borderRadius: 7, color: copied ? '#22c55e' : '#71717a', fontSize: 12 }}>
          {copied ? t.copied : t.copy}
        </button>
      </div>
      {keywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: hashtags.length > 0 ? 8 : 0 }}>
          {keywords.map(({ label }) => (
            <span key={label} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 13, background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa' }}>{label}</span>
          ))}
        </div>
      )}
      {hashtags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {hashtags.map(({ label }) => (
            <span key={label} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 13, background: '#1d4ed820', border: '1px solid #3b82f640', color: '#60a5fa' }}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicPage() {
  const [cfg, setCfg] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [captions, setCaptions] = useState([]);
  const [loadings, setLoadings] = useState([]);
  const [errors, setErrors] = useState([]);
  const generatedRef = useRef([]);
  const [lang, setLang] = useState('en');
  const langRef = useRef('en');
  const [shuffled, setShuffled] = useState({});
  const t = STRINGS[lang];
  langRef.current = lang;

  useEffect(() => {
    try { const l = localStorage.getItem('uiLang'); if (l === 'en' || l === 'vi') setLang(l); } catch (_) {}
  }, []);

  function changeLang(l) {
    setLang(l);
    try { localStorage.setItem('uiLang', l); } catch (_) {}
  }

  function shuffleBoth() {
    const tp = topics[activeTab];
    setShuffled(prev => ({ ...prev, [activeTab]: { tags: shuffleHashtags(tp?.tagsAndKeywords), ig: shuffleHashtags(tp?.igTagsAndKeywords) } }));
    generateForTab(activeTab, cfg);
  }

  function generateForTab(tabIndex, activeCfg) {
    const topic = activeCfg.topics[tabIndex];
    if (!topic?.topic?.trim()) return;

    setErrors(prev => { const a = [...prev]; a[tabIndex] = ''; return a; });
    setLoadings(prev => { const a = [...prev]; a[tabIndex] = true; return a; });
    setCaptions(prev => { const a = [...prev]; a[tabIndex] = ''; return a; });

    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.topic, tagsAndKeywords: topic.tagsAndKeywords, charLimit: topic.charLimit ?? activeCfg.charLimit ?? 280, topicLabel: topic.label || `${STRINGS[langRef.current].topic} ${tabIndex + 1}`, language: topic.language || 'vi', allowEmojis: !!topic.allowEmojis }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setErrors(prev => { const a = [...prev]; a[tabIndex] = data.error || STRINGS[langRef.current].genFailed; return a; });
        } else {
          setCaptions(prev => { const a = [...prev]; a[tabIndex] = data.caption; return a; });
        }
      })
      .catch(e => {
        setErrors(prev => { const a = [...prev]; a[tabIndex] = STRINGS[langRef.current].reqFailed + e.message; return a; });
      })
      .finally(() => {
        setLoadings(prev => { const a = [...prev]; a[tabIndex] = false; return a; });
      });
  }

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      // Only show topics the admin has enabled for the public page.
      const cfgData = { ...data, topics: (data.topics || []).filter(t => t.enabled !== false) };
      const n = cfgData.topics.length;
      setCfg(cfgData);
      setCaptions(Array(n).fill(''));
      setLoadings(Array(n).fill(false));
      setErrors(Array(n).fill(''));
      generatedRef.current = Array(n).fill(false);
      if (n > 0 && cfgData.topics[0].topic?.trim()) {
        generatedRef.current[0] = true;
        generateForTab(0, cfgData);
      }
    }).catch(() => {});
  }, []);

  function handleTabChange(idx) {
    setActiveTab(idx);
    if (cfg && !generatedRef.current[idx]) {
      generatedRef.current[idx] = true;
      generateForTab(idx, cfg);
    }
  }

  const topics = cfg?.topics || [];
  const caption = captions[activeTab] || '';
  const loading = loadings[activeTab] || false;
  const error = errors[activeTab] || '';
  const tagsText = (shuffled[activeTab]?.tags ?? topics[activeTab]?.tagsAndKeywords)?.trim() || '';
  const igTagsText = (shuffled[activeTab]?.ig ?? topics[activeTab]?.igTagsAndKeywords)?.trim() || '';
  const activeCharLimit = topics[activeTab]?.charLimit ?? cfg?.charLimit ?? 280;
  const hasTagsSection = tagsText.length > 0 || igTagsText.length > 0;
  const isReady = topics.length > 0 && !!topics[activeTab]?.topic?.trim();
  const multiTab = topics.length > 1;

  return (
    <div style={{ minHeight: '100vh', padding: '36px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 4, marginBottom: 12 }}>
          {[['en', 'English'], ['vi', 'Tiếng Việt']].map(([code, name]) => (
            <button
              key={code}
              onClick={() => changeLang(code)}
              style={{ padding: '4px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: `1px solid ${lang === code ? '#3b82f6' : '#27272a'}`, background: lang === code ? '#1d4ed820' : 'transparent', color: lang === code ? '#60a5fa' : '#71717a' }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.jpg" alt="LingOrm Vbots" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px', display: 'block' }} />
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa' }}>LingOrm_Vbots Caption Generator</h1>
          <p style={{ fontSize: 14, color: '#52525b' }}>
            {!cfg ? t.loading : isReady ? t.ready(activeCharLimit) : t.notConfigured}
          </p>
        </div>

        {multiTab && (
          <div style={{ display: 'flex', gap: 6, width: '100%', marginBottom: 24, flexWrap: 'wrap' }}>
            {topics.map((tp, i) => (
              <button
                key={i}
                onClick={() => handleTabChange(i)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  border: `1px solid ${activeTab === i ? '#3b82f6' : '#27272a'}`,
                  background: activeTab === i ? '#1d4ed820' : 'transparent',
                  color: activeTab === i ? '#60a5fa' : '#71717a',
                  cursor: 'pointer',
                }}
              >
                {tp.label || `${t.topic} ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10, padding: '10px 16px', color: '#f87171', fontSize: 13, marginBottom: 20, width: '100%' }}>
            {error}
          </div>
        )}

        <div style={{ width: '100%' }}>
          {(caption || loading) && (
            <div style={{ marginBottom: hasTagsSection ? 20 : 0 }}>
              <div style={{ marginBottom: 10 }}><span style={secLabel}>{t.caption}</span></div>
              {loading ? (
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                  <span style={{ fontSize: 14, color: '#52525b' }}>{t.generating}</span>
                </div>
              ) : (
                <CaptionCard caption={caption} charLimit={activeCharLimit} tagsText={tagsText} igTagsText={igTagsText} t={t} />
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {[[t.shuffle, () => generateForTab(activeTab, cfg), false], [t.shuffleBoth, shuffleBoth, true]].map(([text, onClick, primary]) => (
                  <button
                    key={text}
                    onClick={onClick}
                    disabled={loading || !isReady}
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                      background: loading ? '#27272a' : primary ? '#2563eb' : '#1d4ed820',
                      border: `1px solid ${loading ? '#27272a' : primary ? '#3b82f6' : '#3b82f680'}`,
                      color: loading ? '#52525b' : primary ? '#fff' : '#93c5fd',
                      boxShadow: loading || !primary ? 'none' : '0 0 14px #2563eb60',
                      cursor: loading || !isReady ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? t.generating : text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {caption && hasTagsSection && <div style={{ borderTop: '1px solid #27272a', margin: '0 0 20px' }} />}
          {tagsText && <TagsSection tagsAndKeywords={tagsText} label={t.tagsKeywords} t={t} />}
          {tagsText && igTagsText && <div style={{ height: 12 }} />}
          {igTagsText && <TagsSection tagsAndKeywords={igTagsText} label={t.igTagsKeywords} t={t} />}
        </div>
      </div>
    </div>
  );
}
