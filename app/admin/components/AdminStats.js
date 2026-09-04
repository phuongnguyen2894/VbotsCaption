'use client';
import { card, sLbl } from './styles.js';
import { useStatsData } from './useStatsData.js';

function fmtDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// ── Admin Stats ───────────────────────────────────────────────────────────────
export function AdminStats({ passcode }) {
  const { data, loading, error } = useStatsData(passcode);

  if (loading) return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading stats…</div>;
  if (error) return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-danger)', fontSize: 14 }}>{error}</div>;

  const today = data.days[0];

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-info)' }}>{data.totalUsers}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total users</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>{today.captions}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Captions today</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>{today.users}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Users today</div>
        </div>
      </div>

      <div style={card}>
        <label style={sLbl}>Last 7 days</label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Date</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Captions</th>
              <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Unique users</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((row, i) => (
              <tr key={row.date} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 0', color: i === 0 ? 'var(--color-text-info)' : 'var(--color-text-primary)', fontWeight: i === 0 ? 600 : 400 }}>
                  {fmtDate(row.date)}{i === 0 ? ' (today)' : ''}
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{row.captions}</td>
                <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{row.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
