'use client';
import { useState, useEffect } from 'react';
import { card, sLbl, inp } from './styles.js';

// ── Admin X Posts ─────────────────────────────────────────────────────────────
export function AdminXPosts({ passcode }) {
  const [state, setState] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Credentials form
  const [showCredForm, setShowCredForm] = useState(false);
  const [credFields, setCredFields] = useState({ cookieString: '' });
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsMsg, setCredsMsg] = useState('');

  // Add target form
  const [addType, setAddType] = useState('tweet'); // 'tweet' | 'account'
  const [tweetUrl, setTweetUrl] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [targetTopicIdx, setTargetTopicIdx] = useState(0);
  const [targetNote, setTargetNote] = useState('');
  const [addingTarget, setAddingTarget] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // Generate & post
  const [postTopicIdx, setPostTopicIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState('');

  // Per-target reply preview
  const [replyState, setReplyState] = useState({}); // { [targetId]: { caption, generating, posting, msg } }

  // Run auto
  const [runningAuto, setRunningAuto] = useState(false);
  const [autoMsg, setAutoMsg] = useState('');

  // Schedule
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [savingSched, setSavingSched] = useState(false);
  const [schedMsg, setSchedMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [stateRes, cfgRes] = await Promise.all([
        fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'get-state' }) }),
        fetch('/api/config'),
      ]);
      const [s, c] = await Promise.all([stateRes.json(), cfgRes.json()]);
      if (!s.error) setState(s);
      if (!c.error) setConfig(c);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveCreds = async () => {
    setSavingCreds(true); setCredsMsg('');
    try {
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'save-creds', ...credFields }) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setCredsMsg(`Server error (${res.status}): ${text.slice(0, 200)}`); setSavingCreds(false); return; }
      if (data.error) { setCredsMsg(data.error); }
      else { setCredsMsg('Saved! Try posting to confirm.'); setShowCredForm(false); setCredFields({ cookieString: '' }); await load(); }
    } catch (e) { setCredsMsg(`Error: ${e.message}`); } finally { setSavingCreds(false); }
  };

  const addTarget = async () => {
    setAddingTarget(true); setAddMsg('');
    try {
      const payload = addType === 'account'
        ? { passcode, action: 'add-account', username: accountUsername, topicIdx: targetTopicIdx, note: targetNote }
        : { passcode, action: 'add-target', tweetUrl, topicIdx: targetTopicIdx, note: targetNote };
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) { setAddMsg(data.error); }
      else { setState(prev => ({ ...prev, targets: data.targets })); setTweetUrl(''); setAccountUsername(''); setTargetNote(''); setAddMsg('Added!'); setTimeout(() => setAddMsg(''), 2000); }
    } catch { setAddMsg('Network error.'); } finally { setAddingTarget(false); }
  };

  const removeTarget = async (id) => {
    const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'remove-target', id }) });
    const data = await res.json();
    if (!data.error) setState(prev => ({ ...prev, targets: data.targets }));
  };

  const resetTarget = async (id) => {
    const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'reset-target', id }) });
    const data = await res.json();
    if (!data.error) setState(prev => ({ ...prev, targets: data.targets }));
  };

  const toggleAccount = async (id) => {
    const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'toggle-account', id }) });
    const data = await res.json();
    if (!data.error) setState(prev => ({ ...prev, targets: data.targets }));
  };

  const fetchLatest = async (target) => {
    setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], fetching: true, latestPost: null, caption: '', msg: '' } }));
    try {
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'fetch-latest', targetId: target.id }) });
      const data = await res.json();
      if (data.error) {
        setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], fetching: false, msg: data.error } }));
      } else {
        setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], fetching: false, latestPost: data.post } }));
        // Auto-generate caption for this account target
        generateReplyDraft(target);
      }
    } catch { setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], fetching: false, msg: 'Network error.' } })); }
  };

  const generateDraft = async () => {
    setGenerating(true); setDraft(''); setPostMsg('');
    const topic = config?.topics?.[postTopicIdx];
    if (!topic) { setGenerating(false); return; }
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topic.topic, tagsAndKeywords: topic.tagsAndKeywords, language: topic.language || 'vi', charLimit: topic.charLimit || 250 }) });
      const data = await res.json();
      setDraft(data.caption || '');
    } catch {} finally { setGenerating(false); }
  };

  const postTweet = async () => {
    if (!draft.trim()) return;
    setPosting(true); setPostMsg('');
    try {
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'post-tweet', text: draft }) });
      const data = await res.json();
      if (data.error) { setPostMsg('Error: ' + data.error); }
      else { setPostMsg('Posted! Tweet ID: ' + data.tweetId); setDraft(''); }
    } catch { setPostMsg('Network error.'); } finally { setPosting(false); }
  };

  const generateReplyDraft = async (target) => {
    const topic = config?.topics?.[target.topicIdx] || config?.topics?.[0];
    if (!topic) return;
    setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], generating: true, caption: '', msg: '' } }));
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topic.topic, tagsAndKeywords: topic.tagsAndKeywords, language: topic.language || 'vi', charLimit: topic.charLimit || 250 }) });
      const data = await res.json();
      setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], generating: false, caption: data.caption || '' } }));
    } catch { setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], generating: false } })); }
  };

  const postReply = async (target) => {
    const rs = replyState[target.id];
    if (!rs?.caption?.trim()) return;
    // Account targets need the live tweet ID from fetch-latest
    if (target.type === 'account' && !rs.latestPost?.tweetId) return;
    setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], posting: true, msg: '' } }));
    try {
      const body = { passcode, action: 'reply-tweet', text: rs.caption, targetId: target.id };
      if (target.type === 'account') body.tweetId = rs.latestPost.tweetId;
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], posting: false, msg: 'Error: ' + data.error } })); }
      else { setState(prev => ({ ...prev, targets: data.targets })); setReplyState(prev => ({ ...prev, [target.id]: { posting: false, caption: '', msg: 'Replied!' } })); }
    } catch { setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], posting: false, msg: 'Network error.' } })); }
  };

  const saveSchedule = async () => {
    if (!schedDate || !schedTime) return;
    setSavingSched(true); setSchedMsg('');
    const scheduledAt = new Date(`${schedDate}T${schedTime}`).toISOString();
    try {
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'save-schedule', scheduledAt }) });
      const data = await res.json();
      if (data.error) { setSchedMsg(data.error); }
      else { setSchedMsg('Schedule saved.'); setState(prev => ({ ...prev, schedule: { scheduledAt, lastRunAt: prev.schedule?.lastRunAt || null } })); setTimeout(() => setSchedMsg(''), 2500); }
    } catch { setSchedMsg('Network error.'); } finally { setSavingSched(false); }
  };

  const clearSchedule = async () => {
    await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'clear-schedule' }) });
    setState(prev => ({ ...prev, schedule: null }));
    setSchedDate(''); setSchedTime('');
  };

  const runAuto = async () => {
    setRunningAuto(true); setAutoMsg('');
    try {
      const res = await fetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode, action: 'run-auto' }) });
      const data = await res.json();
      if (data.skipped) { setAutoMsg(data.skipped); }
      else {
        const ok = (data.results || []).filter(r => r.ok).length;
        const errors = (data.results || []).filter(r => r.error).map(r => r.error);
        setAutoMsg(`Done: ${ok} replied${errors.length ? ` — ${errors.join('; ')}` : ''}`);
        await load();
      }
    } catch { setAutoMsg('Network error.'); } finally { setRunningAuto(false); }
  };

  const topics = config?.topics || [];

  if (loading) return <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading…</div>;

  const statusBadge = (status) => ({
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
    background: status === 'done' ? 'var(--color-background-success)' : 'var(--color-background-warning)',
    color: status === 'done' ? 'var(--color-text-success)' : 'var(--color-text-warning)',
  });

  return (
    <div style={{ padding: '0 16px 40px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Credentials */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...sLbl, marginBottom: 0 }}>X (Twitter) credentials</label>
          {state?.creds?.configured && (
            <span style={{ fontSize: 12, color: 'var(--color-text-success)', fontWeight: 500 }}>Configured</span>
          )}
        </div>
        {!state?.creds?.configured && (
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-danger)' }}>Not configured — add your X API credentials to enable posting.</p>
        )}
        {state?.creds?.configured && !showCredForm && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Session cookies saved. Update if you get auth errors.</p>
        )}
        {showCredForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 500 }}>Easiest way:</p>
              <p style={{ margin: '0 0 4px' }}>1. Open <strong>x.com</strong> (logged in) → F12 → <strong>Network</strong> tab</p>
              <p style={{ margin: '0 0 4px' }}>2. Filter by <strong>Fetch/XHR</strong>, then refresh the page</p>
              <p style={{ margin: '0 0 4px' }}>3. Right-click any <strong>x.com</strong> request → <strong>Copy → Copy as cURL</strong></p>
              <p style={{ margin: 0 }}>4. Paste the whole thing below</p>
            </div>
            <div>
              <label style={{ ...sLbl, marginBottom: 4 }}>cURL command or cookie string</label>
              <textarea value={credFields.cookieString} onChange={e => setCredFields(p => ({ ...p, cookieString: e.target.value }))}
                placeholder={'curl \'https://x.com/...\' \\\n  -H \'cookie: auth_token=...; ct0=...\' \\\n  ...'}
                style={{ ...inp, fontFamily: 'monospace', fontSize: 11, minHeight: 100, resize: 'vertical' }} autoComplete="off" spellCheck={false} />
            </div>
            <button onClick={saveCreds} disabled={savingCreds || !credFields.cookieString.trim()} style={{ minHeight: 44, fontSize: 14, fontWeight: 500 }}>
              {savingCreds ? 'Saving…' : 'Save'}
            </button>
            {credsMsg && <p style={{ margin: 0, fontSize: 13, color: credsMsg.includes('Saved') ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>{credsMsg}</p>}
          </div>
        )}
        <button onClick={() => { setShowCredForm(v => !v); setCredsMsg(''); }}
          style={{ fontSize: 13, color: 'var(--color-text-info)', background: 'transparent', border: '0.5px solid var(--color-border-info)', borderRadius: 8, padding: '6px 12px', minHeight: 36 }}>
          {showCredForm ? 'Cancel' : (state?.creds?.configured ? 'Update credentials' : 'Add credentials')}
        </button>
      </div>

      {/* Reply targets */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...sLbl, marginBottom: 0 }}>Auto-reply targets</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(state?.targets || []).some(t => t.status === 'pending') && (
              <button onClick={runAuto} disabled={runningAuto}
                style={{ fontSize: 12, color: 'var(--color-text-info)', background: 'transparent', border: '0.5px solid var(--color-border-info)', borderRadius: 8, padding: '4px 10px' }}>
                {runningAuto ? 'Running…' : 'Run now'}
              </button>
            )}
          </div>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Add tweet URLs to reply to. The cron runs daily at 9 AM UTC and auto-replies with a generated caption using the selected topic.
        </p>
        {autoMsg && <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-info)' }}>{autoMsg}</p>}

        {/* Add target form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
          <label style={{ ...sLbl, marginBottom: 0 }}>Add reply target</label>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['tweet', 'Specific tweet'], ['account', 'Account (latest post)']].map(([val, lbl]) => {
              const active = addType === val;
              return (
                <button key={val} onClick={() => setAddType(val)} style={{ flex: 1, minHeight: 36, fontSize: 13, borderRadius: 8,
                  border: `0.5px solid ${active ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                  background: active ? 'var(--color-background-info)' : 'transparent',
                  color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)', fontWeight: active ? 600 : 400 }}>
                  {lbl}
                </button>
              );
            })}
          </div>
          {addType === 'tweet' ? (
            <input type="text" value={tweetUrl} onChange={e => setTweetUrl(e.target.value)} placeholder="https://x.com/.../status/123… or tweet ID" style={inp} />
          ) : (
            <input type="text" value={accountUsername} onChange={e => setAccountUsername(e.target.value)} placeholder="@username or username" style={inp} />
          )}
          {topics.length > 1 && (
            <select value={targetTopicIdx} onChange={e => setTargetTopicIdx(Number(e.target.value))} style={{ ...inp, fontSize: 15 }}>
              {topics.map((t, i) => <option key={i} value={i}>{t.label || `Topic ${i + 1}`}</option>)}
            </select>
          )}
          <input type="text" value={targetNote} onChange={e => setTargetNote(e.target.value)} placeholder="Note (optional)" style={inp} />
          <button onClick={addTarget} disabled={addingTarget || (addType === 'tweet' ? !tweetUrl.trim() : !accountUsername.trim())} style={{ minHeight: 40, fontSize: 14 }}>
            {addingTarget ? 'Adding…' : '+ Add target'}
          </button>
          {addMsg && <p style={{ margin: 0, fontSize: 13, color: addMsg.includes('Added') ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>{addMsg}</p>}
        </div>

        {/* Target list */}
        {(state?.targets || []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>No reply targets yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(state?.targets || []).map(target => {
              const rs = replyState[target.id] || {};
              const topicLabel = topics[target.topicIdx]?.label || `Topic ${target.topicIdx + 1}`;
              const isAccount = target.type === 'account';
              const accountStatus = isAccount ? (target.status === 'paused' ? 'paused' : 'active') : target.status;

              return (
                <div key={target.id} style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isAccount ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>@{target.username}</span>
                      ) : (
                        <a href={target.tweetUrl?.startsWith('http') ? target.tweetUrl : `https://x.com/i/status/${target.tweetId}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: 'var(--color-text-info)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {(target.tweetUrl || target.tweetId || '').length > 50 ? (target.tweetUrl || target.tweetId || '').slice(0, 50) + '…' : (target.tweetUrl || target.tweetId || '')}
                        </a>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ ...statusBadge(accountStatus), ...(isAccount && accountStatus === 'active' ? { background: 'var(--color-background-success)', color: 'var(--color-text-success)' } : {}) }}>
                          {isAccount ? accountStatus : target.status}
                        </span>
                        {isAccount && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 99, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>recurring</span>}
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{topicLabel}</span>
                        {target.note && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{target.note}</span>}
                        {isAccount && target.lastRepliedAt && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>last replied {new Date(target.lastRepliedAt).toLocaleDateString()}</span>}
                        {!isAccount && target.repliedAt && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>replied {new Date(target.repliedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isAccount ? (
                        <>
                          <button onClick={() => toggleAccount(target.id)}
                            style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 8px' }}>
                            {target.status === 'paused' ? 'Resume' : 'Pause'}
                          </button>
                          <button onClick={() => fetchLatest(target)} disabled={rs.fetching || rs.generating}
                            style={{ fontSize: 12, color: 'var(--color-text-info)', background: 'transparent', border: '0.5px solid var(--color-border-info)', borderRadius: 6, padding: '4px 8px' }}>
                            {rs.fetching ? 'Fetching…' : rs.generating ? 'Generating…' : 'Preview & reply'}
                          </button>
                        </>
                      ) : (
                        <>
                          {target.status === 'done' && (
                            <button onClick={() => resetTarget(target.id)} style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 8px' }}>Reset</button>
                          )}
                          {target.status === 'pending' && (
                            <button onClick={() => generateReplyDraft(target)} disabled={rs.generating}
                              style={{ fontSize: 12, color: 'var(--color-text-info)', background: 'transparent', border: '0.5px solid var(--color-border-info)', borderRadius: 6, padding: '4px 8px' }}>
                              {rs.generating ? '…' : 'Preview & reply'}
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => removeTarget(target.id)} style={{ fontSize: 12, color: 'var(--color-text-danger)', background: 'transparent', border: 'none', padding: '4px 6px' }}>✕</button>
                    </div>
                  </div>

                  {/* Reply preview panel */}
                  {(rs.latestPost || rs.caption !== undefined || rs.msg) && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' }}>
                      {/* Show the tweet being replied to (account targets) */}
                      {isAccount && rs.latestPost && (
                        <div style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Latest post from @{target.username}</p>
                          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{rs.latestPost.text?.slice(0, 200)}{rs.latestPost.text?.length > 200 ? '…' : ''}</p>
                          <a href={rs.latestPost.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--color-text-info)' }}>View on X</a>
                        </div>
                      )}
                      {rs.caption !== undefined && (
                        <textarea value={rs.caption} onChange={e => setReplyState(prev => ({ ...prev, [target.id]: { ...prev[target.id], caption: e.target.value } }))}
                          rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 8, fontSize: 14 }} />
                      )}
                      {rs.caption !== undefined && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => isAccount ? fetchLatest(target) : generateReplyDraft(target)} disabled={rs.generating || rs.fetching}
                            style={{ fontSize: 12, background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 8px' }}>Regenerate</button>
                          <button onClick={() => postReply(target)} disabled={rs.posting || !rs.caption?.trim() || (isAccount && !rs.latestPost?.tweetId)}
                            style={{ fontSize: 12, fontWeight: 500, background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)', borderRadius: 6, padding: '4px 12px', color: 'var(--color-text-info)' }}>
                            {rs.posting ? 'Posting…' : 'Post reply'}
                          </button>
                        </div>
                      )}
                      {rs.msg && <p style={{ margin: '6px 0 0', fontSize: 12, color: rs.msg.includes('Error') || rs.msg.includes('error') ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>{rs.msg}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div style={card}>
        <label style={sLbl}>Scheduled run</label>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Set a target date and time. When you open this page after that time, you'll see a prompt to run. Times are in your local timezone.
        </p>
        {state?.schedule?.scheduledAt && (() => {
          const due = new Date(state.schedule.scheduledAt);
          const isReady = Date.now() >= due.getTime();
          const alreadyRan = state.schedule.lastRunAt && new Date(state.schedule.lastRunAt) >= due;
          return (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              border: `0.5px solid ${isReady && !alreadyRan ? 'var(--color-border-success)' : 'var(--color-border-info)'}`,
              background: isReady && !alreadyRan ? 'var(--color-background-success)' : 'var(--color-background-info)' }}>
              {isReady && !alreadyRan ? (
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-success)' }}>
                  Ready — scheduled time has passed. Hit "Run now" above.
                </p>
              ) : (
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)' }}>
                  Scheduled: {due.toLocaleString()}
                </p>
              )}
              {state.schedule.lastRunAt && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Last ran: {new Date(state.schedule.lastRunAt).toLocaleString()}
                </p>
              )}
            </div>
          );
        })()}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
            style={{ flex: 1, fontSize: 15 }} min={new Date().toISOString().slice(0, 10)} />
          <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
            style={{ flex: 1, fontSize: 15 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveSchedule} disabled={savingSched || !schedDate || !schedTime}
            style={{ flex: 1, minHeight: 40, fontSize: 14, fontWeight: 500 }}>
            {savingSched ? 'Saving…' : 'Set schedule'}
          </button>
          {state?.schedule?.scheduledAt && (
            <button onClick={clearSchedule}
              style={{ fontSize: 13, color: 'var(--color-text-danger)', background: 'transparent', border: '0.5px solid var(--color-border-danger)', borderRadius: 'var(--border-radius-md)', padding: '0 14px', minHeight: 40 }}>
              Clear
            </button>
          )}
        </div>
        {schedMsg && <p style={{ margin: '8px 0 0', fontSize: 13, color: schedMsg.includes('error') ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>{schedMsg}</p>}
      </div>

      {/* Generate & post new tweet */}
      <div style={card}>
        <label style={sLbl}>Post a new tweet</label>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Generate a caption and post it directly to your X account.</p>
        {topics.length > 1 && (
          <select value={postTopicIdx} onChange={e => setPostTopicIdx(Number(e.target.value))} style={{ ...inp, fontSize: 15, marginBottom: 10 }}>
            {topics.map((t, i) => <option key={i} value={i}>{t.label || `Topic ${i + 1}`}</option>)}
          </select>
        )}
        <button onClick={generateDraft} disabled={generating || !topics.length} style={{ width: '100%', minHeight: 44, fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
          {generating ? 'Generating…' : 'Generate caption'}
        </button>
        {draft && (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
              style={{ ...inp, resize: 'vertical', marginBottom: 8, fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 12, color: draft.length > 280 ? 'var(--color-text-danger)' : 'var(--color-text-secondary)', alignSelf: 'center' }}>{draft.length} chars</span>
              <button onClick={postTweet} disabled={posting || !draft.trim() || draft.length > 280}
                style={{ minHeight: 40, fontSize: 14, fontWeight: 500, padding: '0 20px', background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)', color: 'var(--color-text-info)', borderRadius: 'var(--border-radius-md)' }}>
                {posting ? 'Posting…' : 'Post to X'}
              </button>
            </div>
          </>
        )}
        {postMsg && <p style={{ margin: '8px 0 0', fontSize: 13, color: postMsg.includes('Error') ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>{postMsg}</p>}
      </div>
    </div>
  );
}
