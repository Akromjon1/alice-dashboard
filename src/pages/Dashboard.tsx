import { FileText, Puzzle, Zap, Cpu, HardDrive, MemoryStick, Clock } from 'lucide-react';
import { getStatus, getSkills, getNotes } from '../api';
import { usePolling } from '../hooks/usePolling';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface SystemInfo {
  ram?: { percent: string; usedGB: string; totalGB: string };
  cpu?: { usage: string };
  disk?: { freeGB: string; usedGB: string; totalGB: string };
  uptime?: string;
}

interface NoteItem {
  name: string;
  date: string;
  content: string;
}

interface SkillItem {
  name: string;
  description: string;
}

interface DashboardData {
  system: SystemInfo | null;
  skills: SkillItem[];
  notes: NoteItem[];
}

export default function Dashboard() {
  const { data, loading } = usePolling<DashboardData>(async () => {
    const [st, s, n] = await Promise.all([
      getStatus().catch(() => ({})),
      getSkills().catch(() => ({ skills: [] })),
      getNotes().catch(() => ({ notes: [] })),
    ]);
    return {
      system: st.system || null,
      skills: s.skills || [],
      notes: n.notes || [],
    };
  }, 15000);

  const system = data?.system ?? null;
  const skills = data?.skills ?? [];
  const notes = data?.notes ?? [];

  const ramPercent = system?.ram ? parseFloat(system.ram.percent) : 0;
  const ramColor = ramPercent > 80 ? 'var(--red)' : ramPercent > 60 ? 'var(--yellow)' : 'var(--green)';

  if (loading) {
    return (
      <>
        <div className="main-header">Dashboard</div>
        <div className="main-content">
          <LoadingSkeleton count={4} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="main-header">Dashboard</div>
      <div className="main-content">
        <div className="grid">
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Zap size={14} /> Status</div>
              <span className="badge green">live</span>
            </div>
            <div className="card-value" style={{ color: 'var(--green)' }}>Online</div>
          </div>

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

          {system?.cpu && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><Cpu size={14} /> CPU</div>
              </div>
              <div className="card-value">{system.cpu.usage}</div>
            </div>
          )}

          {system?.disk && (
            <div className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title"><HardDrive size={14} /> Disk</div>
              </div>
              <div className="card-value">{system.disk.freeGB}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}> GB free</span></div>
              <div className="card-desc" style={{ marginTop: 4 }}>{system.disk.usedGB} / {system.disk.totalGB} GB used</div>
            </div>
          )}

          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><Puzzle size={14} /> Skills</div>
            </div>
            <div className="card-value">{skills.length}</div>
          </div>

          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-header">
              <div className="card-title"><FileText size={14} /> Notes</div>
            </div>
            <div className="card-value">{notes.length}</div>
          </div>
        </div>

        {system?.uptime && (
          <div className="uptime-bar">
            <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {system.uptime}
          </div>
        )}

        <h3 style={{ marginTop: 28, marginBottom: 14, fontSize: 15, fontWeight: 600 }}>Recent Notes</h3>
        {notes.length === 0 ? (
          <div className="card-desc">No notes yet</div>
        ) : (
          notes.slice(0, 5).map((n: NoteItem) => (
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
