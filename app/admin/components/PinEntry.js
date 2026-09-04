'use client';
import { useState, useEffect, useRef } from 'react';

// ── PIN Entry ─────────────────────────────────────────────────────────────────
export function PinEntry({ onSuccess }) {
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
        <img src="/logo.jpg" alt="LingOrm Vbots" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 20px', display: 'block' }} />
        <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>Admin access</p>
        <p style={{ margin: '0 0 2rem', fontSize: 14, color: 'var(--color-text-secondary)' }}>{checking ? 'Verifying…' : 'Enter your 6-digit passcode'}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', animation: shaking ? 'pinShake 0.55s ease' : 'none' }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => (refs.current[i] = el)} type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} disabled={checking}
              style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 500, borderRadius: 'var(--border-radius-md)', borderColor: error ? 'var(--color-border-danger)' : d ? 'var(--color-border-info)' : undefined }}
            />
          ))}
        </div>
        {error && !checking && <p style={{ margin: '1rem 0 0', fontSize: 13, color: 'var(--color-text-danger)' }}>Incorrect passcode — try again</p>}
      </div>
    </div>
  );
}
