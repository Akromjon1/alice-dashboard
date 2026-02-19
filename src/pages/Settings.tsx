import { useState } from 'react';
import { clearConfig } from '../api';

export default function Settings({ onLogout }: { onLogout: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const handleLogout = () => {
    clearConfig();
    onLogout();
  };

  return (
    <>
      <div className="main-header">Settings</div>
      <div className="main-content">
        <div className="card" style={{ cursor: 'default' }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Connection</div>
          <div className="card-desc" style={{ marginBottom: 16 }}>
            Disconnect from the current gateway and return to login.
          </div>
          {confirming ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px', background: 'var(--red)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
                }}
              >
                Yes, disconnect
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  padding: '8px 16px', background: 'var(--border)', color: 'var(--text)',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{
                padding: '8px 16px', background: 'var(--bg)', color: 'var(--red)',
                border: '1px solid var(--red)', borderRadius: 8, cursor: 'pointer', fontSize: 13
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </>
  );
}
