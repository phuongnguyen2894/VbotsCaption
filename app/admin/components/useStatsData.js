'use client';
import { useState, useEffect } from 'react';

export function useStatsData(passcode) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }) })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [passcode]);
  return { data, loading, error };
}
