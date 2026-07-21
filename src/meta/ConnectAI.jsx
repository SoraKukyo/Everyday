import { useEffect, useMemo, useState } from 'react';
import { getAnonymousUser, isSupabaseConfigured, supabase } from '../data/supabaseClient';
import { buildMcpConnectorUrl, createMcpAccessToken, sha256Hex, tokenPrefix } from '../lib/mcpAccessTokens';

const endpoint = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/everyday-mcp` : '';
const blankFeedback = { kind: 'info', message: '' };

export default function ConnectAI() {
  const [user, setUser] = useState(null); const [tokens, setTokens] = useState([]); const [label, setLabel] = useState(''); const [revealed, setRevealed] = useState('');
  const [connection, setConnection] = useState(isSupabaseConfigured ? 'loading' : 'error'); const [feedback, setFeedback] = useState(isSupabaseConfigured ? blankFeedback : { kind: 'error', message: 'Supabase configuration is required.' });
  const [generating, setGenerating] = useState(false); const [revokingId, setRevokingId] = useState(null); const [copyState, setCopyState] = useState('idle');
  const activeTokens = useMemo(() => tokens.filter((token) => !token.revoked_at), [tokens]);

  const refresh = async (active = user) => {
    if (!active) return;
    const { data, error } = await supabase.from('mcp_access_tokens').select('id,label,token_prefix,created_at,revoked_at').eq('user_id', active.id).order('created_at', { ascending: false });
    if (error) throw error;
    setTokens(data ?? []);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getAnonymousUser().then(async (active) => { setUser(active); await refresh(active); setConnection('ready'); }).catch((error) => {
      setConnection('error');
      setFeedback({ kind: 'error', message: error.message.includes('mcp_access_tokens') ? 'Set up is needed: run mcp-access-tokens-migration.sql in Supabase, then reload this page.' : error.message });
    });
  }, []);

  async function generate() {
    if (!user) return;
    setGenerating(true); setFeedback(blankFeedback); setRevealed('');
    try {
      const token = createMcpAccessToken(); const hash = await sha256Hex(token);
      const { error } = await supabase.from('mcp_access_tokens').insert({ user_id: user.id, token_hash: hash, token_prefix: tokenPrefix(token), label: label.trim() || null });
      if (error) throw error;
      setLabel(''); setRevealed(token); await refresh();
      setFeedback({ kind: 'success', message: 'Access token created. Copy it now - it will not be shown again.' });
    } catch (error) { setFeedback({ kind: 'error', message: error.message.includes('mcp_access_tokens') ? 'Set up is needed: run mcp-access-tokens-migration.sql in Supabase, then try again.' : error.message }); } finally { setGenerating(false); }
  }

  async function copy(value, target) {
    try {
      await navigator.clipboard.writeText(value); setCopyState(target);
      setFeedback({ kind: 'success', message: target === 'token' ? 'Access token copied.' : target === 'connection-url' ? 'Connection URL copied.' : 'MCP endpoint copied.' });
    } catch { setFeedback({ kind: 'error', message: 'Copy failed. Select and copy the text manually.' }); }
  }

  async function revoke(id) {
    if (!window.confirm('Revoke this token? Any AI client using it will immediately lose access.')) return;
    setRevokingId(id); setFeedback(blankFeedback);
    try {
      const { error } = await supabase.from('mcp_access_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await refresh(); setFeedback({ kind: 'success', message: 'Token revoked. Connected AI clients can no longer read your data with it.' });
    } catch (error) { setFeedback({ kind: 'error', message: error.message }); } finally { setRevokingId(null); }
  }

  const connectionCopy = connection === 'loading' ? 'Checking secure access...' : connection === 'ready' ? 'Ready to create a connection' : 'Setup needs attention';
  const connectionUrl = buildMcpConnectorUrl(endpoint, revealed);

  return <main className="tracker-shell accent-blue"><section className="suite-grid connect-ai-suite">
    <header className="suite-header"><div><span className="eyebrow">Private, portable context</span><h1>Connect to AI</h1></div><span className={`connection-badge ${connection}`}><i />{connectionCopy}</span></header>
    <section className="suite-card suite-overview"><span className="section-label">Your MCP server</span><strong>Everyday MCP</strong><small>{connection === 'ready' ? 'Your Everyday account is ready. Create a token when you are ready to connect an AI client.' : 'Checking whether your private token storage is ready.'}</small></section>
    <section className="suite-card"><span className="section-label">Connection endpoint</span><code className="mcp-endpoint">{endpoint || 'Configure VITE_SUPABASE_URL first'}</code><div className="mcp-inline-actions"><button type="button" className="quiet" disabled={!endpoint} onClick={() => copy(endpoint, 'endpoint')}>{copyState === 'endpoint' ? 'Copied endpoint' : 'Copy endpoint'}</button></div><p className="empty-copy">Use this endpoint with a bearer token for direct API tests, or use the generated connector URL for a No auth MCP connector. The server exposes only read tools.</p></section>
    <section className="suite-card composer-card"><span className="section-label">Generate access token</span><label>Label <span className="optional">optional</span><input disabled={!user || generating} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="My ChatGPT connection" maxLength="80" /></label><button type="button" disabled={!user || generating} aria-busy={generating} onClick={generate}>{generating && <i className="button-spinner" aria-hidden="true" />}{generating ? 'Creating secure token...' : 'Generate access token'}</button><small>{connection === 'loading' ? 'Loading your secure token storage...' : 'For your safety, the full token is shown once only. Treat it like a password.'}</small></section>
    {revealed && <section className="suite-card mcp-reveal"><span className="section-label">Raw token for Bearer auth</span><code>{revealed}</code><p>Use this for direct API testing or a connector that supports Bearer authentication. This is the only time Everyday can display it.</p><button type="button" onClick={() => copy(revealed, 'token')}>{copyState === 'token' ? 'Copied token' : 'Copy token'}</button><button type="button" className="text-button" onClick={() => setRevealed('')}>I stored it</button></section>}
    {connectionUrl && <section className="suite-card mcp-reveal mcp-connector-url"><span className="section-label">Connector URL - No auth mode</span><code>{connectionUrl}</code><p className="mcp-sensitive"><strong>Sensitive link.</strong> This URL contains your access token. It may appear in browser history, connector settings, or server logs. Do not share it publicly; revoke the token immediately if it is exposed.</p><button type="button" onClick={() => copy(connectionUrl, 'connection-url')}>{copyState === 'connection-url' ? 'Copied connection URL' : 'Copy connection URL'}</button></section>}
    <section className="suite-card suite-records"><div className="chart-title"><div><span className="section-label">Access tokens</span><h2>{activeTokens.length} active</h2></div>{connection === 'loading' && <small>Loading tokens...</small>}</div><ul>{tokens.map((token) => <li key={token.id}><span><strong>{token.label || 'Unnamed connection'}</strong><small>{token.token_prefix} - created {new Date(token.created_at).toLocaleDateString()}{token.revoked_at ? ` - revoked ${new Date(token.revoked_at).toLocaleDateString()}` : ''}</small></span>{token.revoked_at ? <small>Revoked</small> : <button type="button" disabled={revokingId === token.id} aria-busy={revokingId === token.id} onClick={() => revoke(token.id)}>{revokingId === token.id ? 'Revoking...' : 'Revoke'}</button>}</li>)}</ul>{connection === 'ready' && !tokens.length && <p className="empty-copy">No access tokens yet. Generate one when you are ready to connect an AI client.</p>}</section>
    {feedback.message && <p className={`mcp-feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.kind === 'success' ? 'Success:' : feedback.kind === 'error' ? 'Error:' : 'Info:'} {feedback.message}</p>}
  </section></main>;
}
