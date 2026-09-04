'use client';
import { useState, useEffect } from 'react';
import { card, sLbl, inp } from './styles.js';

// ── Admin Config ──────────────────────────────────────────────────────────────
export function AdminConfig({ passcode }) {
  const [cfg, setCfg] = useState({ topics: [{ label: '', topic: '', tagsAndKeywords: '', language: 'vi', charLimit: 250, enabled: true }], charLimit: 280, provider: 'groq', geminiModel: 'gemini-2.5-flash' });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      // Backward-compat: give each topic its own charLimit, defaulting to the old global one.
      // Topics saved before the enable/disable feature existed default to enabled.
      const fallback = data.charLimit ?? 250;
      const topics = (data.topics || []).map(t => ({ charLimit: fallback, enabled: true, ...t }));
      setCfg({ provider: 'groq', geminiModel: 'gemini-2.5-flash', ...data, topics });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const setTopicField = (idx, field, value) => {
    setCfg(prev => {
      const topics = [...prev.topics];
      topics[idx] = { ...topics[idx], [field]: value };
      return { ...prev, topics };
    });
  };

  const addTopic = () => {
    if (cfg.topics.length >= 5) return;
    setCfg(prev => ({ ...prev, topics: [...prev.topics, { label: '', topic: '', tagsAndKeywords: '', language: 'vi', charLimit: prev.charLimit ?? 250, enabled: true }] }));
  };

  const removeTopic = (idx) => {
    if (cfg.topics.length <= 1) return;
    setCfg(prev => ({ ...prev, topics: prev.topics.filter((_, i) => i !== idx) }));
  };

  const moveTopic = (idx, dir) => {
    setCfg(prev => {
      const target = idx + dir;
      if (target < 0 || target >= prev.topics.length) return prev;
      const topics = [...prev.topics];
      [topics[idx], topics[target]] = [topics[target], topics[idx]];
      return { ...prev, topics };
    });
  };

  const duplicateTopic = (idx) => {
    if (cfg.topics.length >= 5) return;
    setCfg(prev => {
      const copy = { ...prev.topics[idx], label: `${prev.topics[idx].label || 'Topic'} copy` };
      const topics = [...prev.topics];
      topics.splice(idx + 1, 0, copy);
      return { ...prev, topics };
    });
  };

  const save = async () => {
    setSaveError('');
    try {
      const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, config: cfg }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(data.error || 'Save failed.'); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('Network error — please try again.');
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span></div>;

  return (
    <>
      <div style={{ padding: '0 16px', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={card}>
            <label style={sLbl}>Caption generation provider</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: (cfg.provider || 'groq') === 'gemini' ? 12 : 0 }}>
              {[['groq', 'Groq'], ['gemini', 'Gemini']].map(([val, lbl]) => {
                const active = (cfg.provider || 'groq') === val;
                return (
                  <button
                    key={val}
                    onClick={() => setCfg(prev => ({ ...prev, provider: val }))}
                    style={{
                      flex: 1, minHeight: 40, fontSize: 14, borderRadius: 'var(--border-radius-md)',
                      border: `0.5px solid ${active ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                      background: active ? 'var(--color-background-info)' : 'transparent',
                      color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
            {(cfg.provider || 'groq') === 'gemini' && (
              <>
                <label style={{ ...sLbl, marginBottom: 4 }}>Gemini model</label>
                <input
                  type="text"
                  value={cfg.geminiModel ?? ''}
                  onChange={e => setCfg(prev => ({ ...prev, geminiModel: e.target.value }))}
                  placeholder="e.g. gemini-2.5-flash or gemini-3.1-flash-lite"
                  style={inp}
                />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Must match a model your Gemini API keys have access to. Configure keys in the API Keys tab.
                </p>
              </>
            )}
          </div>

          {cfg.topics.map((t, idx) => (
            <div key={idx} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <label style={{ ...sLbl, marginBottom: 0 }}>Topic {idx + 1}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => moveTopic(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, minHeight: 36, border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-secondary)', opacity: idx === 0 ? 0.4 : 1 }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveTopic(idx, 1)}
                      disabled={idx === cfg.topics.length - 1}
                      title="Move down"
                      style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, minHeight: 36, border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-secondary)', opacity: idx === cfg.topics.length - 1 ? 0.4 : 1 }}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    onClick={() => setTopicField(idx, 'enabled', t.enabled === false)}
                    title={t.enabled === false ? 'Hidden from the public page — click to enable' : 'Visible on the public page — click to disable'}
                    style={{
                      fontSize: 13, padding: '6px 12px', borderRadius: 8, minHeight: 36,
                      border: `0.5px solid ${t.enabled === false ? 'var(--color-border-tertiary)' : 'var(--color-border-success)'}`,
                      background: t.enabled === false ? 'transparent' : 'var(--color-background-success)',
                      color: t.enabled === false ? 'var(--color-text-tertiary)' : 'var(--color-text-success)',
                      fontWeight: 500,
                    }}
                  >
                    {t.enabled === false ? 'Hidden' : '● Live'}
                  </button>
                  {cfg.topics.length < 5 && (
                    <button
                      onClick={() => duplicateTopic(idx)}
                      title="Duplicate this topic"
                      style={{ fontSize: 13, color: 'var(--color-text-info)', padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-info)', background: 'transparent', minHeight: 36 }}
                    >
                      Duplicate
                    </button>
                  )}
                  {cfg.topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(idx)}
                      style={{ fontSize: 13, color: 'var(--color-text-danger)', padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-danger)', background: 'transparent', minHeight: 36 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <label style={{ ...sLbl, marginBottom: 4 }}>Tab label</label>
              <input
                type="text"
                value={t.label}
                onChange={e => setTopicField(idx, 'label', e.target.value)}
                placeholder="e.g. Ep 1, Bvlgari…"
                style={{ ...inp, marginBottom: 12 }}
              />
              <label style={{ ...sLbl, marginBottom: 4 }}>Caption language</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['vi', 'Tiếng Việt'], ['en', 'English']].map(([val, lbl]) => {
                  const active = (t.language || 'vi') === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setTopicField(idx, 'language', val)}
                      style={{
                        flex: 1, minHeight: 40, fontSize: 14, borderRadius: 'var(--border-radius-md)',
                        border: `0.5px solid ${active ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                        background: active ? 'var(--color-background-info)' : 'transparent',
                        color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '-6px 0 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                Tiếng Việt → model đã train. English → model nhanh nhất.
              </p>
              <label style={{ ...sLbl, marginBottom: 4 }}>Topic description</label>
              <textarea
                value={t.topic}
                onChange={e => setTopicField(idx, 'topic', e.target.value)}
                rows={3}
                style={{ ...inp, resize: 'vertical', marginBottom: 12 }}
                placeholder="Describe the subject of the posts…"
              />
              <label style={{ ...sLbl, marginBottom: 4 }}>Keywords & hashtags</label>
              <input
                type="text"
                value={t.tagsAndKeywords}
                onChange={e => setTopicField(idx, 'tagsAndKeywords', e.target.value)}
                placeholder="e.g. LingOrm #LingOrm"
                style={inp}
              />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Prefix with # for hashtags — separate by spaces</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
                <label style={{ ...sLbl, marginBottom: 0 }}>Character limit</label>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-info)' }}>{t.charLimit ?? 250}</span>
              </div>
              <input
                type="range"
                min={60}
                max={280}
                step={10}
                value={t.charLimit ?? 250}
                onChange={e => setTopicField(idx, 'charLimit', Number(e.target.value))}
                style={{ ...inp, height: 28 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}><span>60</span><span>280</span></div>
            </div>
          ))}

          {cfg.topics.length < 5 && (
            <button
              onClick={addTopic}
              style={{ fontSize: 14, color: 'var(--color-text-info)', background: 'transparent', border: '0.5px dashed var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '14px', minHeight: 48 }}
            >
              + Add topic ({cfg.topics.length}/5)
            </button>
          )}

          {saveError && (
            <div style={{ background: 'var(--color-background-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 'var(--border-radius-md)', padding: '12px 14px', color: 'var(--color-text-danger)', fontSize: 14 }}>
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Sticky save button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--color-background-base)', borderTop: '0.5px solid var(--color-border-tertiary)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <button
            onClick={save}
            style={{ width: '100%', minHeight: 48, fontSize: 15, fontWeight: 500, ...(saved ? { borderColor: 'var(--color-border-success)', color: 'var(--color-text-success)' } : {}) }}
          >
            {saved ? '✓ Configuration saved' : 'Save configuration'}
          </button>
        </div>
      </div>
    </>
  );
}
