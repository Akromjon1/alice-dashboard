import { useEffect, useState } from 'react';
import { getStatus, getSkills, getNotes } from '../api';
import { FileText, Puzzle, Zap, Cpu, HardDrive, MemoryStick } from 'lucide-react';

export default function Dashboard() {
  const [skills, setSkills] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [system, setSystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    Promise.all([
      getStatus().catch(() => ({})),
      getSkills().catch(() => ({ skills: [] })),
      getNotes().catch(() => ({ notes: [] })),
    ]).then(([st, s, n]) => {
      setSystem(st.system || null);
      setSkills(s.skills || []);
      setNotes(n.notes || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000); // refresh every 15s
    return () => clearInterval(interval);
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

          {system?.ram && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><MemoryStick size={16} /> RAM</div>
                <span className={`badge ${parseFloat(system.ram.percent) > 80 ? 'red' : parseFloat(system.ram.percent) > 60 ? 'yellow' : 'green'}`}>
                  {system.ram.percent}%
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{system.ram.usedGB} / {system.ram.totalGB} GB</div>
              <div style={{ marginTop: 8, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${system.ram.percent}%`, background: parseFloat(system.ram.percent) > 80 ? 'var(--red)' : 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {system?.cpu && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><Cpu size={16} /> CPU</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{system.cpu.usage}</div>
            </div>
          )}

          {system?.disk && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><HardDrive size={16} /> Disk</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{system.disk.freeGB} GB free</div>
              <div className="card-desc">{system.disk.usedGB} / {system.disk.totalGB} GB used</div>
            </div>
          )}

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

        {system?.uptime && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
            {system.uptime}
          </div>
        )}

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
