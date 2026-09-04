'use client';
import { card, sLbl } from './styles.js';
import { useStatsData } from './useStatsData.js';

// ── Admin Topics ──────────────────────────────────────────────────────────────
export function AdminTopics({ passcode }) {
  const { data, loading, error } = useStatsData(passcode);

  if (loading) return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading…</div>;
  if (error) return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-danger)', fontSize: 14 }}>{error}</div>;

  const allTopicEntries = Object.entries(data.topicsAllTime || {})
    .sort((a, b) => new Date(b[1].lastAt || 0) - new Date(a[1].lastAt || 0));

  if (allTopicEntries.length === 0) {
    return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>No topic data yet — generate some captions first.</div>;
  }

  const thStyle = { padding: '6px 0', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 };
  const fmtWhen = (iso) => iso ? new Date(iso).toLocaleString() : '—';

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <label style={sLbl}>Topics by most recent</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Topic</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Captions</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Unique users</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Last used</th>
            </tr>
          </thead>
          <tbody>
            {allTopicEntries.map(([label, t]) => (
              <tr key={label} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 0', color: 'var(--color-text-primary)' }}>{label}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>{t.captions}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>{t.users}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 12, color: 'var(--color-text-secondary)' }}>{fmtWhen(t.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
