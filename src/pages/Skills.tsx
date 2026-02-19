import { useEffect, useState } from 'react';
import { getSkills } from '../api';
import { Puzzle, AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Skills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    getSkills()
      .then(data => { setSkills(data.skills || []); setError(null); })
      .catch(err => { setError(err.message || 'Failed to load'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="main-header">Skills</div>
      <div className="main-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
          Installed skills from your OpenClaw instance.
        </p>
        {loading ? (
          <LoadingSkeleton count={3} />
        ) : error ? (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <AlertTriangle size={32} style={{ color: 'var(--yellow)', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Failed to load skills</div>
            <div className="card-desc" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={() => { setLoading(true); setError(null); refresh(); }} style={{
              padding: '10px 20px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : skills.length === 0 ? (
          <div className="card-desc">No skills found</div>
        ) : (
          skills.map((skill: any) => (
            <div key={skill.name} className="card" style={{ cursor: 'default' }}>
              <div className="skill-card">
                <div className="skill-info">
                  <div className="card-title" style={{ marginBottom: 4 }}>
                    <Puzzle size={16} />
                    {skill.name}
                  </div>
                  <div className="card-desc">{skill.description || 'No description'}</div>
                </div>
                <span className="badge green">active</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
