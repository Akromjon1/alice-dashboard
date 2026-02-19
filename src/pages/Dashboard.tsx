import { useEffect, useState } from 'react';
import { getSessionsList } from '../api';
import { Activity, Cpu, Zap } from 'lucide-react';

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionsList()
      .then(data => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = sessions.filter(s => s.kind !== 'ended');

  return (
    <>
      <div className="main-header">Dashboard</div>
      <div className="main-content">
        <div className="grid">
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Activity size={16} /> Active Sessions</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{active.length}</div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Cpu size={16} /> Total Sessions</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{sessions.length}</div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Zap size={16} /> Status</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>Online</div>
          </div>
        </div>

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Recent Sessions</h3>
        {loading ? (
          <div className="card-desc">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="card-desc">No sessions found</div>
        ) : (
          sessions.slice(0, 10).map((s: any) => (
            <div key={s.sessionKey} className="card">
              <div className="card-header">
                <div className="card-title">
                  <span className={`status-dot ${s.kind === 'ended' ? 'stopped' : 'running'}`} />
                  {s.label || s.sessionKey}
                </div>
                <span className={`badge ${s.kind === 'ended' ? 'red' : 'green'}`}>{s.kind || 'active'}</span>
              </div>
              <div className="card-desc">
                {s.lastMessages?.[0]?.content?.slice(0, 100) || 'No messages'}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
