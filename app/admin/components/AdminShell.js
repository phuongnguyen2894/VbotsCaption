'use client';
import { useState } from 'react';
import { AdminConfig } from './AdminConfig.js';
import { AdminKeysTabs } from './AdminKeys.js';
import { AdminXPosts } from './AdminXPosts.js';
import { AdminStats } from './AdminStats.js';
import { AdminTopics } from './AdminTopics.js';

// ── Admin Shell (tabs) ────────────────────────────────────────────────────────
export function AdminShell({ passcode }) {
  const [tab, setTab] = useState('config');

  const tabStyle = (t) => ({
    fontSize: 14,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
    background: 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--color-border-info)' : '2px solid transparent',
    padding: '10px 16px',
    cursor: 'pointer',
    minHeight: 0,
  });

  return (
    <div style={{ minHeight: '100vh', paddingBottom: tab === 'config' ? 90 : 40 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <img src="/logo.jpg" alt="LingOrm Vbots" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)' }}>Admin</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', marginBottom: 16 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', padding: '0 16px', overflowX: 'auto' }}>
          <button style={tabStyle('config')} onClick={() => setTab('config')}>Configuration</button>
          <button style={tabStyle('keys')} onClick={() => setTab('keys')}>API Keys</button>
          <button style={tabStyle('xposts')} onClick={() => setTab('xposts')}>X Posts</button>
          <button style={tabStyle('stats')} onClick={() => setTab('stats')}>Stats</button>
          <button style={tabStyle('topics')} onClick={() => setTab('topics')}>Topics</button>
        </div>
      </div>

      {tab === 'config' && <AdminConfig passcode={passcode} />}
      {tab === 'keys' && <AdminKeysTabs passcode={passcode} />}
      {tab === 'xposts' && <AdminXPosts passcode={passcode} />}
      {tab === 'stats' && <AdminStats passcode={passcode} />}
      {tab === 'topics' && <AdminTopics passcode={passcode} />}
    </div>
  );
}
