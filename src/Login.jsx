import { useState } from 'react';
import { login } from './storage.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', fontFamily: "'DM Mono','Fira Code',monospace",
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#1a1d2e', border: '1px solid #2d3149', borderRadius: 8,
          padding: '40px 48px', display: 'flex', flexDirection: 'column', gap: 18,
          minWidth: 320,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', letterSpacing: 1 }}>
            ◈ PROJECT TRACKER
          </span>
        </div>

        {error && (
          <div style={{
            background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: 4,
            color: '#f87171', padding: '8px 12px', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              background: '#0f1117', border: '1px solid #2d3149', borderRadius: 4,
              color: '#e2e8f0', padding: '8px 12px', fontSize: 15,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              background: '#0f1117', border: '1px solid #2d3149', borderRadius: 4,
              color: '#e2e8f0', padding: '8px 12px', fontSize: 15,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username || !password}
          style={{
            marginTop: 4,
            background: loading || !username || !password ? '#1e2235' : '#1e3a5f',
            border: `1px solid ${loading || !username || !password ? '#2d3149' : '#3b82f6'}`,
            borderRadius: 4, color: '#e2e8f0', padding: '10px',
            fontSize: 15, fontFamily: 'inherit', fontWeight: 700,
            cursor: loading || !username || !password ? 'default' : 'pointer',
            transition: 'all 0.1s',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
