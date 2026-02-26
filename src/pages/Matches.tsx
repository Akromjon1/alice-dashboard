import { useEffect, useState } from 'react';
import { getMatches, addTeam } from '../api';
import { Trophy, Plus, X, Calendar, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';

function VsCard({ left, right, label, time, date, status, accent, icon }: {
  left: string; right: string; label: string;
  time?: string; date?: string; status?: string; accent?: string; icon?: string;
}) {
  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    live: { bg: 'var(--red-bg)', color: 'var(--red)', label: '● LIVE' },
    upcoming: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'UPCOMING' },
    completed: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'DONE' },
  };
  const st = statusStyles[status || 'upcoming'];
  return (
    <div className="card" style={{ marginBottom: 0, borderLeft: `3px solid ${accent || 'var(--accent)'}`, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        {status && st && (
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 700, fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>
            {st.label}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
        <div style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{left}</div>
        <div style={{ fontFamily: 'Fira Code', fontSize: 9, fontWeight: 700, color: 'var(--red)', padding: '2px 6px', background: 'var(--red-bg)', borderRadius: 4, flexShrink: 0 }}>VS</div>
        <div style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{right}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          {date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} /> {date}</span>}
          {time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {time}</span>}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 20 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 8 }} />
    </div>
  );
}

function NoteCard({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
      {text}
    </div>
  );
}

function InfoCard({ title, lines }: { title: string; lines: { label: string; value: string }[] }) {
  return (
    <div className="card" style={{ marginBottom: 0, borderLeft: '3px solid var(--accent)', padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
          <span style={{ fontWeight: 600 }}>{l.value}</span>
        </div>
      ))}
    </div>
  );
}

function parseMatch(matchStr: string): { left: string; right: string } {
  const parts = matchStr.split(/\s+vs\s+/i);
  if (parts.length === 2) return { left: parts[0].trim(), right: parts[1].trim() };
  return { left: matchStr, right: '?' };
}

export default function Matches() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });

  const refresh = () => {
    getMatches()
      .then(d => { setData(d); setError(null); })
      .catch(err => { setError(err.message || 'Failed to load'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!newTeam.name) return;
    await addTeam(newTeam.name, newTeam.league);
    setNewTeam({ name: '', league: '' }); setShowAdd(false); refresh();
  };

  const renderMatchList = (matches: any[], accent: string, icon?: string) => {
    if (!matches || matches.length === 0) return <NoteCard text="No matches today" />;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {matches.map((m: any, i: number) => {
          const { left, right } = parseMatch(m.match);
          return (
            <VsCard key={i} left={left} right={right} label={m.event} time={m.time} status="upcoming" accent={accent} icon={icon}
              date={m.format || m.status} />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="main-header"><Trophy size={20} /> Matches</div>
      <div className="main-content">
        {loading ? <LoadingSkeleton count={4} /> : error ? (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <AlertTriangle size={32} style={{ color: 'var(--yellow)', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Failed to load matches</div>
            <div className="card-desc" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={() => { setLoading(true); setError(null); refresh(); }} style={{
              padding: '10px 20px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Header info */}
            {data.date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={12} /> {data.date}
                </span>
                {data.updated && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} /> Updated: {new Date(data.updated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}

            {/* 🎯 CS2 */}
            {data.cs2 && (
              <>
                <SectionHeader icon="🎯" title="CS2" />
                {data.cs2.tier1?.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Tier 1</div>
                    {renderMatchList(data.cs2.tier1, 'var(--yellow)', '🎯')}
                  </>
                )}
                {data.cs2.lowerTier?.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' }}>Lower Tier</div>
                    {renderMatchList(data.cs2.lowerTier, 'var(--border)', '🎯')}
                  </>
                )}
                {data.cs2.tier1?.length === 0 && data.cs2.lowerTier?.length === 0 && <NoteCard text="No CS2 matches today" />}
                {data.cs2.note && <div style={{ marginTop: 8 }}><NoteCard text={data.cs2.note} /></div>}
              </>
            )}

            {/* ⚔️ Dota 2 */}
            {data.dota2 && (
              <>
                <SectionHeader icon="⚔️" title="Dota 2" />
                {data.dota2.tier1?.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Tier 1</div>
                    {renderMatchList(data.dota2.tier1, 'var(--red)', '⚔️')}
                  </>
                )}
                {(!data.dota2.tier1 || data.dota2.tier1.length === 0) && <NoteCard text="No Dota 2 matches today" />}
                {data.dota2.note && <div style={{ marginTop: 8 }}><NoteCard text={data.dota2.note} /></div>}
              </>
            )}

            {/* ⚽ Premier League */}
            {data.premierLeague && (
              <>
                <SectionHeader icon="⚽" title="Premier League" />
                {renderMatchList(data.premierLeague.matches, 'var(--accent)', '⚽')}
                {data.premierLeague.note && <div style={{ marginTop: 8 }}><NoteCard text={data.premierLeague.note} /></div>}
              </>
            )}

            {/* 🏆 Champions League */}
            {data.championsLeague && (
              <>
                <SectionHeader icon="🏆" title="Champions League" />
                {renderMatchList(data.championsLeague.matches, 'var(--yellow)', '🏆')}
                {data.championsLeague.note && <div style={{ marginTop: 8 }}><NoteCard text={data.championsLeague.note} /></div>}
              </>
            )}

            {/* ⚪ Real Madrid */}
            {data.realMadrid && (
              <>
                <SectionHeader icon="⚪" title="Real Madrid" />
                <InfoCard title="Real Madrid" lines={[
                  ...(data.realMadrid.lastMatch ? [{ label: 'Last Match', value: data.realMadrid.lastMatch }] : []),
                  ...(data.realMadrid.competition ? [{ label: 'Competition', value: data.realMadrid.competition }] : []),
                  ...(data.realMadrid.result ? [{ label: 'Result', value: data.realMadrid.result }] : []),
                  ...(data.realMadrid.status ? [{ label: 'Status', value: data.realMadrid.status }] : []),
                  ...(data.realMadrid.nextMatch ? [{ label: 'Next Match', value: data.realMadrid.nextMatch }] : []),
                ]} />
              </>
            )}

            {/* 🔴 Arsenal */}
            {data.arsenal && (
              <>
                <SectionHeader icon="🔴" title="Arsenal" />
                <InfoCard title="Arsenal" lines={[
                  ...(data.arsenal.lastMatch ? [{ label: 'Last Match', value: data.arsenal.lastMatch }] : []),
                  ...(data.arsenal.competition ? [{ label: 'Competition', value: data.arsenal.competition }] : []),
                  ...(data.arsenal.result ? [{ label: 'Result', value: data.arsenal.result }] : []),
                  ...(data.arsenal.status ? [{ label: 'Status', value: data.arsenal.status }] : []),
                  ...(data.arsenal.nextMatch ? [{ label: 'Next Match', value: data.arsenal.nextMatch }] : []),
                ]} />
              </>
            )}

            {/* Add team */}
            <div style={{ marginTop: 20 }}>
              {!showAdd ? (
                <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans' }}>
                  <Plus size={14} /> Add Team
                </button>
              ) : (
                <div className="card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input placeholder="Team name" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans', outline: 'none' }} />
                    <input placeholder="League" value={newTeam.league} onChange={e => setNewTeam({ ...newTeam, league: e.target.value })} style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans', outline: 'none' }} />
                    <button onClick={handleAdd} style={{ padding: '10px 20px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowAdd(false)} style={{ padding: '10px 12px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
