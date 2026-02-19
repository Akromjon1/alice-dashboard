import { useEffect, useState } from 'react';
import { getSkills, getNotes } from '../api';
import { FileText, Puzzle, Zap } from 'lucide-react';

export default function Dashboard() {
  const [skills, setSkills] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSkills().catch(() => ({ skills: [] })),
      getNotes().catch(() => ({ notes: [] })),
    ]).then(([s, n]) => {
      setSkills(s.skills || []);
      setNotes(n.notes || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <><div className="main-header">Dashboard</div><div className="main-content"><div className="card-desc">Loading...</div></div></>;

  return (
    <>
      <div className="main-header">Dashboard</div>
      <div className="main-content">
        <div className="grid">
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Zap size={16} /> Status</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>Online</div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Puzzle size={16} /> Skills</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{skills.length}</div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><FileText size={16} /> Notes</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{notes.length}</div>
          </div>
        </div>

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Recent Notes</h3>
        {notes.length === 0 ? (
          <div className="card-desc">No notes yet</div>
        ) : (
          notes.slice(0, 5).map((n: any) => (
            <div key={n.name} className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><FileText size={16} /> {n.name}</div>
                <span className="badge green">{n.date}</span>
              </div>
              <div className="card-desc" style={{ whiteSpace: 'pre-wrap' }}>
                {n.content?.slice(0, 200)}{n.content?.length > 200 ? '...' : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
