import { useState } from 'react';
import { saveConfig } from '../api';

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
    
    try {
      const res = await fetch(`${cleanUrl}/api/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error('Invalid credentials');
      
      saveConfig({ gatewayUrl: cleanUrl, apiToken: token });
      onLogin();
    } catch {
      setError('Could not connect. Check URL and token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>🤖 Alice Dashboard</h2>
        <p>Connect to your OpenClaw gateway</p>
        
        {error && <div className="error">{error}</div>}
        
        <label>Gateway URL</label>
        <input
          type="url"
          placeholder="https://your-tunnel.cfargotunnel.com"
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
