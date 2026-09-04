'use client';
import { useState, useEffect } from 'react';
import { card, sLbl, inp } from './styles.js';

// ── Admin API Keys ────────────────────────────────────────────────────────────
const PROVIDER_META = {
  groq: { label: 'Groq', placeholder: 'gsk_xxxxxxxx...\ngsk_yyyyyyyy...' },
  gemini: { label: 'Gemini', placeholder: 'AIzaSyxxxxxxxx...\nAIzaSyyyyyyyy...' },
};

function AdminKeys({ passcode, provider }) {
  const meta = PROVIDER_META[provider] || PROVIDER_META.groq;
  const [keys, setKeys] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulk, setBulk] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, provider }) });
      const data = await res.json();
      if (!data.error) { setKeys(data.keys || []); setTotal(data.total || 0); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { setBulk(''); setMsg(''); load(); }, [provider]);

  const addKeys = async () => {
    const lines = [...new Set(bulk.split(/[\s,]+/).map(s => s.trim()).filter(Boolean))];
    if (!lines.length) return;
    setAdding(true); setMsg('');
    try {
      const res = await fetch('/api/keys/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, provider, keys: lines.map(k => ({ key: k, label: '' })) }) });
      const data = await res.json();
      if (data.error) { setMsg(data.error); }
      else {
        const n = (s) => data.results.filter(r => r.status === s).length;
        setMsg(`Added ${data.added}. Valid ${n('valid')}, rate-limited ${n('quota')}, duplicate ${n('duplicate')}, invalid ${n('invalid') + n('error')}.`);
        setBulk('');
        await load();
      }
    } catch { setMsg('Network error — try again.'); } finally { setAdding(false); }
  };

  const remove = async (id) => {
    await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, provider, action: 'remove', id }) });
    await load();
  };

  const clearAll = async () => {
    if (typeof window !== 'undefined' && !window.confirm(`Remove ALL ${meta.label} keys?`)) return;
    await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, provider, action: 'clear' }) });
    await load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...sLbl, marginBottom: 0 }}>Add {meta.label} API keys</label>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{total}/100</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Paste keys (one per line, or separated by spaces/commas). Each is verified against {meta.label}, then rotated automatically when one is rate-limited.
        </p>
        <textarea
          value={bulk}
          onChange={e => setBulk(e.target.value)}
          rows={5}
          placeholder={meta.placeholder}
          style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', marginBottom: 10 }}
        />
        <button onClick={addKeys} disabled={adding || !bulk.trim()} style={{ width: '100%', minHeight: 44, fontSize: 14, fontWeight: 500 }}>
          {adding ? 'Verifying…' : 'Verify & add keys'}
        </button>
        {msg && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--color-text-info)' }}>{msg}</p>}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ ...sLbl, marginBottom: 0 }}>Active keys</label>
          {keys.length > 0 && <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--color-text-danger)', background: 'transparent', border: '0.5px solid var(--color-border-danger)', borderRadius: 8, padding: '4px 10px' }}>Clear all</button>}
        </div>
        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</p>
        ) : keys.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>No keys yet — add some above. Until then the app uses the single env key.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)' }}>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>{k.masked}</span>
                <button onClick={() => remove(k.id)} style={{ fontSize: 12, color: 'var(--color-text-danger)', background: 'transparent', border: 'none', padding: '4px 8px' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminKeysTabs({ passcode }) {
  const [provider, setProvider] = useState('groq');
  return (
    <div style={{ padding: '0 16px 40px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['groq', 'Groq'], ['gemini', 'Gemini']].map(([val, lbl]) => {
          const active = provider === val;
          return (
            <button
              key={val}
              onClick={() => setProvider(val)}
              style={{
                flex: 1, minHeight: 40, fontSize: 14, borderRadius: 'var(--border-radius-md)',
                border: `0.5px solid ${active ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                background: active ? 'var(--color-background-info)' : 'transparent',
                color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {lbl} keys
            </button>
          );
        })}
      </div>
      <AdminKeys passcode={passcode} provider={provider} />
    </div>
  );
}
