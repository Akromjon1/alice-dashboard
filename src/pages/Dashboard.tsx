import { useEffect, useState } from 'react';
import { getStatus, getSkills, getNotes } from '../api';
import { FileText, Puzzle, Zap, Cpu, HardDrive, MemoryStick, Clock } from 'lucide-react';

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
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const ramPercent = system?.ram ? parseFloat(system.ram.percent) : 0;
  const ramColor = ramPercent > 80 ? 'var(--red)' : ramPercent > 60 ? 'var(--yellow)' : 'var(--green)';

  if (loading) {
    return (
      <>
        <div className="main-header">Dashboard</div>
        <div className="main-content">
          <div className="card-desc">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="main-header">Dashboard</div>
      <div className="main-content">
        <div className="grid">
          {/* Status */}
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Zap size={14} /> Status</div>
              <span className="badge green">live</span>
            </div>
            <div className="card-value" style={{ color: 'var(--green)' }}>Online</div>
          </div>

          {/* RAM */}
          {system?.ram && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><MemoryStick size={14} /> Memory</div>
                <span className={`badge ${ramPercent > 80 ? 'red' : ramPercent > 60 ? 'yellow' : 'green'}`}>
                  {system.ram.percent}%
                </span>
              </div>
              <div className="card-value">{system.ram.usedGB}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}> / {system.ram.totalGB} GB</span></div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${system.ram.percent}%`, background: ramColor }} />
              </div>
            </div>
          )}

          {/* CPU */}
          {system?.cpu && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><Cpu size={14} /> CPU</div>
              </div>
              <div className="card-value">{system.cpu.usage}</div>
            </div>
          )}

          {/* Disk */}
          {system?.disk && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><HardDrive size={14} /> Disk</div>
              </div>
              <div className="card-value">{system.disk.freeGB}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}> GB free</span></div>
              <div className="card-desc" style={{ marginTop: 4 }}>{system.disk.usedGB} / {system.disk.totalGB} GB used</div>
            </div>
          )}

          {/* Skills */}
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Puzzle size={14} /> Skills</div>
            </div>
            <div className="card-value">{skills.length}</div>
          </div>

          {/* Notes */}
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><FileText size={14} /> Notes</div>
            </div>
            <div className="card-value">{notes.length}</div>
          </div>
        </div>

        {/* Uptime */}
        {system?.uptime && (
          <div className="uptime-bar">
            <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {system.uptime}
          </div>
        )}

        {/* Recent Notes */}
        <h3 style={{ marginTop: 28, marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Recent Notes</h3>
        {notes.length === 0 ? (
          <div className="card-desc">No notes yet</div>
        ) : (
          notes.slice(0, 5).map((n: any) => (
            <div key={n.name} className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title" style={{ textTransform: 'none', letterSpacing: 0 }}>
                  <FileText size={14} /> {n.name}
                </div>
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
