import { useState } from 'react';
import { saveConfig, getStatus } from '../api';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanUrl = url.replace(/\/+$/, '');

    // Save first so getStatus uses it
    saveConfig({ gatewayUrl: cleanUrl, apiToken: token });

    try {
      await getStatus();
      onLogin();
    } catch {
      setError('Could not connect. Check URL and token.');
      // Clear bad config
      localStorage.removeItem('alice-config');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>🤖 Alice</h2>
        <p>Connect to your Alice API server</p>

        {error && <div className="error">{error}</div>}

        <label>Server URL</label>
        <input
          type="url"
          placeholder="https://your-tunnel.trycloudflare.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />

        <label>API Token</label>
        <input
          type="password"
          placeholder="Your secret token"
          value={token}
          onChange={e => setToken(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}
