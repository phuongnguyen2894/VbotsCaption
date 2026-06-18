'use client';
import { useState, useEffect, useRef } from 'react';

const card = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem 1.25rem' };
const sLbl = { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' };
const inp = { width: '100%', boxSizing: 'border-box' };

function maskKey(k) {
  if (!k || k.length < 12) return '••••';
  return k.slice(0, 8) + '••••' + k.slice(-4);
}

// ── PIN Entry ─────────────────────────────────────────────────────────────────
function PinEntry({ onSuccess }) {
  const [digits, setDigits] = useState(['','','','','','']);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [checking, setChecking] = useState(false);
  const refs = useRef([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  async function checkPin(pin) {
    setChecking(true);
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: pin }) });
      if (res.ok) { onSuccess(pin); return; }
      setError(true); setShaking(true);
      setTimeout(() => { setShaking(false); setError(false); setDigits(['','','','','','']); refs.current[0]?.focus(); }, 600);
    } catch { setError(true); } finally { setChecking(false); }
  }

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[i] = val; setDigits(next); setError(false);
    if (val && i < 5) refs.current[i+1]?.focus();
    if (next.every(d => d !== '')) checkPin(next.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits]; next[i-1] = ''; setDigits(next); refs.current[i-1]?.focus();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes pinShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
        <div style={{ width: 54, height: 54, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 500, margin: '0 auto 20px' }}>𝕏</div>
        <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>Admin access</p>
        <p style={{ margin: '0 0 2rem', fontSize: 14, color: 'var(--color-text-secondary)' }}>{checking ? 'Verifying…' : 'Enter your 6-digit passcode'}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', animation: shaking ? 'pinShake 0.55s ease' : 'none' }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => (refs.current[i] = el)} type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} disabled={checking}
              style={{ width: 46, height: 54, textAlign: 'center', fontSize: 20, fontWeight: 500, borderRadius: 'var(--border-radius-md)', borderColor: error ? 'var(--color-border-danger)' : d ? 'var(--color-border-info)' : undefined }}
            />
          ))}
        </div>
        {error && !checking && <p style={{ margin: '1rem 0 0', fontSize: 13, color: 'var(--color-text-danger)' }}>Incorrect passcode — try again</p>}
      </div>
    </div>
  );
}

// ── Bulk Upload Section ───────────────────────────────────────────────────────
function BulkUpload({ passcode, onDone }) {
  const [phase, setPhase] = useState('idle'); // idle | parsed | verifying | done
  const [parsedKeys, setParsedKeys] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [added, setAdded] = useState(0);
  const fileRef = useRef();

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n');
      const keys = lines
        .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
        .map(l => {
          const [key, ...rest] = l.split(',');
          return { key: key.trim(), label: rest.join(',').trim() };
        })
        .filter(({ key }) => key.length > 10);
      setParsedKeys(keys);
      setResults([]);
      setPhase(keys.length ? 'parsed' : 'idle');
    };
    reader.readAsText(file);
  };

  const verifyAndAdd = async () => {
    setPhase('verifying');
    setProgress(0);
    setResults([]);

    const BATCH = 5;
    const allResults = [];

    for (let i = 0; i < parsedKeys.length; i += BATCH) {
      const batch = parsedKeys.slice(i, i + BATCH);
      const res = await fetch('/api/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, keys: batch }),
      });
      const data = await res.json();
      allResults.push(...(data.results || []));
      setProgress(Math.min(i + BATCH, parsedKeys.length));
      setResults([...allResults]);
      if (data.added) setAdded(a => a + data.added);
    }

    setPhase('done');
    onDone();
  };

  const reset = () => { setPhase('idle'); setParsedKeys([]); setResults([]); setProgress(0); setAdded(0); if (fileRef.current) fileRef.current.value = ''; };

  const statusStyle = (s) => {
    if (s === 'valid') return { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'var(--color-border-success)', label: '✓ Valid' };
    if (s === 'quota') return { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', border: 'var(--color-border-warning)', label: '~ Quota hit' };
    if (s === 'duplicate') return { bg: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)', label: 'Already exists' };
    if (s === 'invalid') return { bg: 'var(--color-background-danger)', color: 'var(--color-text-danger)', border: 'var(--color-border-danger)', label: '✕ Invalid' };
    return { bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: 'var(--color-border-secondary)', label: 'Error' };
  };

  const validCount = results.filter(r => r.status === 'valid' || r.status === 'quota').length;
  const invalidCount = results.filter(r => r.status === 'invalid' || r.status === 'error').length;
  const dupCount = results.filter(r => r.status === 'duplicate').length;

  return (
    <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 12, paddingTop: 12 }}>
      <p style={{ ...sLbl, marginBottom: 10 }}>Bulk upload</p>

      {phase === 'idle' && (
        <div>
          <label style={{ display: 'block', background: 'var(--color-background-secondary)', border: '0.5px dashed var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
            <i class="ti ti-upload" style={{ fontSize: 20, display: 'block', margin: '0 auto 6px', color: 'var(--color-text-secondary)' }} aria-hidden="true"></i>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Click to upload a .txt file</span>
            <input ref={fileRef} type="file" accept=".txt,text/plain" style={{ display: 'none' }} onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />
          </label>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>One key per line. Optional label: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>AIzaSy...,My label</code></p>
        </div>
      )}

      {phase === 'parsed' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}><strong style={{ fontWeight: 500 }}>{parsedKeys.length}</strong> key{parsedKeys.length !== 1 ? 's' : ''} found in file</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Change file</button>
            <button onClick={verifyAndAdd} style={{ fontSize: 13 }}>Verify &amp; add all ↗</button>
          </div>
        </div>
      )}

      {(phase === 'verifying' || phase === 'done') && (
        <div>
          {phase === 'verifying' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <span>Verifying keys…</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}/{parsedKeys.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-background-secondary)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ width: `${parsedKeys.length ? Math.round(progress/parsedKeys.length*100) : 0}%`, height: '100%', background: 'var(--color-text-info)', borderRadius: 100, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-background-success)', border: '0.5px solid var(--color-border-success)', borderRadius: 'var(--border-radius-md)', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-success)' }}>
                <strong style={{ fontWeight: 500 }}>{validCount} added</strong>
                {invalidCount > 0 && <span style={{ color: 'var(--color-text-danger)' }}> · {invalidCount} invalid</span>}
                {dupCount > 0 && <span style={{ color: 'var(--color-text-tertiary)' }}> · {dupCount} duplicate</span>}
              </span>
              <button onClick={reset} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Upload another</button>
            </div>
          )}

          {results.length > 0 && (
            <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
              {results.map((r, i) => {
                const st = statusStyle(r.status);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < results.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 20 }}>{i+1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{maskKey(r.key)}</span>
                      {r.label && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>{r.label}</span>}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 100, whiteSpace: 'nowrap', background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
              {phase === 'verifying' && progress < parsedKeys.length && parsedKeys.slice(results.length, results.length + 3).map((k, i) => (
                <div key={`pending-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 20 }}>{results.length + i + 1}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>{maskKey(k.key)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-tertiary)' }}>Checking…</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── API Keys Section ──────────────────────────────────────────────────────────
function ApiKeysSection({ passcode }) {
  const [keyData, setKeyData] = useState({ keys: [], total: 0, available: 0, date: '' });
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keys?passcode=${encodeURIComponent(passcode)}`);
      setKeyData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addKey = async () => {
    if (!newKey.trim()) return;
    setAdding(true); setAddError('');
    const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'add', key: newKey.trim(), label: newLabel.trim() }) });
    const data = await res.json();
    if (!res.ok) setAddError(data.error || 'Failed to add');
    else { setNewKey(''); setNewLabel(''); load(); }
    setAdding(false);
  };

  const deleteKey = async (id) => {
    await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'delete', id }) });
    load();
  };

  const resetStatus = async () => {
    await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'reset' }) });
    load();
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <label style={{ ...sLbl, marginBottom: 2 }}>API keys</label>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {loading ? 'Loading…' : `${keyData.available} of ${keyData.total} available today · resets at midnight UTC`}
          </p>
        </div>
        {(keyData.total > 0) && <button onClick={resetStatus} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Reset today</button>}
      </div>

      {!loading && keyData.keys.length > 0 && (
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', marginBottom: 12 }}>
          {keyData.keys.map((k, i) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < keyData.keys.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', background: k.exhausted ? 'var(--color-background-danger)' : 'transparent' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 20 }}>{i+1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{k.label}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>{k.masked}</span>
              </div>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 100, whiteSpace: 'nowrap', background: k.exhausted ? 'var(--color-background-danger)' : 'var(--color-background-success)', color: k.exhausted ? 'var(--color-text-danger)' : 'var(--color-text-success)', border: `0.5px solid ${k.exhausted ? 'var(--color-border-danger)' : 'var(--color-border-success)'}` }}>
                {k.exhausted ? 'Exhausted' : 'Active'}
              </span>
              <button onClick={() => deleteKey(k.id)} aria-label={`Delete ${k.label}`} style={{ fontSize: 16, color: 'var(--color-text-tertiary)', padding: '2px 6px' }}>
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && keyData.keys.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', marginBottom: 12 }}>
          No keys added yet — add one below or bulk upload a file.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: addError ? 6 : 10 }}>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (optional)" style={{ width: 140 }} />
        <div style={{ flex: 1, position: 'relative' }}>
          <input value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKey()} placeholder="Paste API key…" type={showKey ? 'text' : 'password'} style={{ ...inp, paddingRight: 36, fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          <button onClick={() => setShowKey(v => !v)} aria-label="Toggle visibility" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}>
            <i class={`ti ti-eye${showKey ? '-off' : ''}`} style={{ fontSize: 16 }} aria-hidden="true"></i>
          </button>
        </div>
        <button onClick={addKey} disabled={adding || !newKey.trim() || keyData.total >= 100} style={{ whiteSpace: 'nowrap' }}>
          <i class="ti ti-plus" style={{ fontSize: 14, verticalAlign: '-2px' }} aria-hidden="true"></i> Add
        </button>
      </div>
      {addError && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-danger)' }}>{addError}</p>}
      <p style={{ margin: '0 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {keyData.total}/100 keys · <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-info)' }}>Get free keys at aistudio.google.com</a>
      </p>

      <BulkUpload passcode={passcode} onDone={load} />
    </div>
  );
}

// ── Admin Config ──────────────────────────────────────────────────────────────
function AdminConfig({ passcode }) {
  const [cfg, setCfg] = useState({ topic: '', tagsAndKeywords: '', charLimit: 280 });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setCfg).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (f, v) => setCfg(p => ({ ...p, [f]: v }));

  const save = async () => {
    setSaveError('');
    const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, config: cfg }) });
    if (!res.ok) { setSaveError('Save failed.'); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span></div>;

  return (
    <div style={{ minHeight: '100vh', padding: '28px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500 }}>𝕏</div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>Admin configuration</p>
        </div>
        <p style={{ margin: '2px 0 1.5rem 42px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>Tone: Inspirational · 1 caption per generation</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card}>
            <label style={sLbl}>Topic</label>
            <textarea value={cfg.topic} onChange={e => set('topic', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Describe the subject of the posts…" />
          </div>

          <div style={card}>
            <label style={sLbl}>Keywords &amp; hashtags</label>
            <input type="text" value={cfg.tagsAndKeywords} onChange={e => set('tagsAndKeywords', e.target.value)} placeholder="e.g. Xman #movie blockbuster #action" style={inp} />
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Prefix with # for hashtags — separate by spaces</p>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <label style={sLbl}>Character limit</label>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-info)' }}>{cfg.charLimit}</span>
            </div>
            <input type="range" min={60} max={280} step={10} value={cfg.charLimit} onChange={e => set('charLimit', Number(e.target.value))} style={inp} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}><span>60</span><span>280</span></div>
          </div>

          {saveError && <div style={{ background: 'var(--color-background-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', color: 'var(--color-text-danger)', fontSize: 13 }}>{saveError}</div>}

          <button onClick={save} style={saved ? { borderColor: 'var(--color-border-success)', color: 'var(--color-text-success)' } : {}}>
            {saved ? '✓ Configuration saved' : 'Save configuration'}
          </button>

          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '4px 0' }} />

          <ApiKeysSection passcode={passcode} />
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState(null);
  return passcode ? <AdminConfig passcode={passcode} /> : <PinEntry onSuccess={setPasscode} />;
}
