import { useEffect, useState } from 'react';
import { getMatches, addTeam } from '../api';
import { Trophy, Plus, X, Shield, ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Gamepad2 } from 'lucide-react';

type View = 'overview' | 'team-calendar' | 'tournament';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: 'var(--red-bg)', color: 'var(--red)', label: '● LIVE' },
  upcoming: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'UPCOMING' },
  completed: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'DONE' },
};

export default function Matches() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });

  const refresh = () => { getMatches().then(d => setData(d)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!newTeam.name) return;
    await addTeam(newTeam.name, newTeam.league);
    setNewTeam({ name: '', league: '' }); setShowAdd(false); refresh();
  };

  const today = new Date().toISOString().split('T')[0];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  // TOURNAMENT VIEW
  if (view === 'tournament') {
    const t = (data.tournaments || {})[selectedTournament];
    if (!t) return <div className="main-content"><div className="card-desc">Tournament not found</div></div>;

    return (
      <>
        <div className="main-header" style={{ gap: 12 }}>
          <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => setView('overview')} />
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          {t.name}
        </div>
        <div className="main-content">
          {/* Tournament info */}
          <div className="card" style={{ cursor: 'default', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Game</div>
                <div style={{ fontWeight: 600 }}>{t.game}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Dates</div>
                <div style={{ fontWeight: 600 }}>{t.dates}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Prize Pool</div>
                <div style={{ fontWeight: 600, color: 'var(--green)' }}>{t.prize}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Location</div>
                <div style={{ fontWeight: 600 }}>{t.location}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Stage</div>
                <span className={`badge ${t.status === 'live' ? 'red' : 'green'}`}>{t.stage}</span>
              </div>
            </div>
          </div>

          {/* Standings */}
          {t.standings && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Standings</h3>
              {Object.entries(t.standings).map(([groupName, teams]: [string, any]) => (
                <div key={groupName} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    {groupName.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="card" style={{ cursor: 'default', padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>#</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Team</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>W-D-L</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((row: any, i: number) => (
                          <tr key={i} style={{
                            borderBottom: '1px solid var(--border)',
                            background: i < 4 ? 'var(--green-bg)' : 'transparent',
                          }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: i < 4 ? 'var(--green)' : 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.team}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'Fira Code, monospace', fontSize: 12 }}>{row.record}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'Fira Code, monospace', fontSize: 12, fontWeight: 700 }}>{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Matches */}
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, marginTop: 8 }}>Matches</h3>
          {(() => {
            const matches = t.matches || [];
            const grouped: Record<string, any[]> = {};
            matches.forEach((m: any) => { (grouped[m.date] = grouped[m.date] || []).push(m); });
            return Object.entries(grouped).map(([date, ms]) => (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: date === today ? 'var(--accent)' : 'var(--text-muted)',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Calendar size={12} /> {date} {date === today && <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>TODAY</span>}
                </div>
                {ms.map((m: any, i: number) => {
                  const st = STATUS_STYLES[m.status] || STATUS_STYLES.upcoming;
                  return (
                    <div key={i} className="card" style={{ cursor: 'default', marginBottom: 6, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 700, fontFamily: 'Fira Code, monospace' }}>
                              {st.label}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.stage} • {m.format}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {m.team1} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.team2}
                          </div>
                          {m.score && <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 14, marginTop: 4 }}>{m.score}</div>}
                        </div>
                        <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                          {m.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}

          {/* Teams */}
          {t.teams && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Teams ({t.teams.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {t.teams.map((team: string) => (
                  <span key={team} style={{
                    padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 13, fontWeight: 500,
                  }}>{team}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // TEAM CALENDAR VIEW
  if (view === 'team-calendar') {
    const calendarMatches = data.calendar?.[selectedTeam] || [];
    const matchDates = new Set(calendarMatches.map((m: any) => m.date));
    const getMatchForDate = (d: string) => calendarMatches.filter((m: any) => m.date === d);
    const days = getDaysInMonth(calendarMonth.year, calendarMonth.month);
    const firstDay = getFirstDay(calendarMonth.year, calendarMonth.month);
    const teamObj = (data.teams || []).find((t: any) => t.id === selectedTeam);
    const teamName = teamObj?.name || selectedTeam;

    return (
      <>
        <div className="main-header" style={{ gap: 12 }}>
          <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => setView('overview')} />
          <span style={{ fontSize: 20 }}>{teamObj?.icon || '⚽'}</span>
          {teamName} — Calendar
        </div>
        <div className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <button onClick={() => setCalendarMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}><ChevronLeft size={20} /></button>
            <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700 }}>{monthNames[calendarMonth.month]} {calendarMonth.year}</span>
            <button onClick={() => setCalendarMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}><ChevronRight size={20} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '8px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasMatch = matchDates.has(dateStr);
              const isToday = dateStr === today;
              const dayMatches = getMatchForDate(dateStr);
              return (
                <div key={day} style={{
                  padding: '8px 4px', borderRadius: 8, textAlign: 'center', minHeight: 70,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: hasMatch ? 'var(--accent-glow)' : isToday ? 'var(--border)' : 'transparent',
                  border: isToday ? '2px solid var(--accent)' : hasMatch ? '1px solid var(--accent)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 14, fontWeight: isToday ? 700 : hasMatch ? 600 : 400, color: hasMatch ? 'var(--accent)' : isToday ? 'var(--text)' : 'var(--text-secondary)', marginBottom: 4 }}>{day}</div>
                  {dayMatches.map((m: any, mi: number) => (
                    <div key={mi} style={{ fontSize: 8, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-glow)', borderRadius: 3, padding: '1px 4px', marginTop: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.competition.length > 10 ? m.competition.slice(0, 10) : m.competition}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>All Fixtures</h3>
          {calendarMatches.map((m: any, i: number) => {
            const isPast = m.date < today;
            return (
              <div key={i} className="card" style={{ cursor: 'default', opacity: isPast ? 0.5 : 1, borderLeft: m.date === today ? '3px solid var(--accent)' : '3px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`badge ${m.competition.includes('UCL') || m.competition.includes('Carabao') || m.competition.includes('FA Cup') || m.competition.includes('Clásico') ? 'yellow' : 'green'}`}>{m.competition}</span>
                  {m.date === today && <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>TODAY</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{m.home} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.away}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {m.date}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {m.time} GMT+5</span>
                  {m.venue && <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {m.venue}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // OVERVIEW
  const tournaments = data.tournaments || {};
  const tournamentKeys = Object.keys(tournaments);

  return (
    <>
      <div className="main-header"><Trophy size={20} /> Matches</div>
      <div className="main-content">
        {loading ? <div className="card-desc">Loading...</div> : (
          <>
            {/* Teams */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Shield size={14} /> Teams
            </h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
              {(data.teams || []).map((team: any) => (
                <div key={team.name} onClick={() => { setSelectedTeam(team.id); setView('team-calendar'); }}
                  className="card" style={{ cursor: 'pointer', padding: '14px 20px', minWidth: 160, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <span style={{ fontSize: 28 }}>{team.icon || '⚽'}</span>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{team.league}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8, fontWeight: 500 }}>View Calendar →</div>
                </div>
              ))}
              <div onClick={() => setShowAdd(true)} className="card" style={{ cursor: 'pointer', padding: '14px 20px', minWidth: 120, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
                <Plus size={24} style={{ color: 'var(--text-muted)' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Add Team</div>
              </div>
            </div>

            {showAdd && (
              <div className="card" style={{ cursor: 'default', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input placeholder="Team name" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                    style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans', outline: 'none' }} />
                  <input placeholder="League" value={newTeam.league} onChange={e => setNewTeam({ ...newTeam, league: e.target.value })}
                    style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans', outline: 'none' }} />
                  <button onClick={handleAdd} style={{ padding: '10px 20px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Add</button>
                  <button onClick={() => setShowAdd(false)} style={{ padding: '10px 12px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><X size={16} /></button>
                </div>
              </div>
            )}

            {/* Tournaments */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Gamepad2 size={14} /> Live Tournaments
            </h3>
            <div className="grid" style={{ marginBottom: 28 }}>
              {tournamentKeys.map(key => {
                const t = tournaments[key];
                const liveCount = (t.matches || []).filter((m: any) => m.status === 'live').length;
                const upcomingToday = (t.matches || []).filter((m: any) => m.date === today).length;
                return (
                  <div key={key} onClick={() => { setSelectedTournament(key); setView('tournament'); }}
                    className="card" style={{ cursor: 'pointer' }}>
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{t.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.game}</div>
                        </div>
                      </div>
                      <span className={`badge ${t.status === 'live' ? 'red' : 'green'}`}>
                        {t.status === 'live' ? '● LIVE' : t.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{t.stage}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>💰 {t.prize}</span>
                      {liveCount > 0 && <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>🔴 {liveCount} live</span>}
                      {upcomingToday > 0 && <span style={{ fontSize: 12, color: 'var(--yellow)' }}>📅 {upcomingToday} today</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 10, fontWeight: 500 }}>View Matches & Standings →</div>
                  </div>
                );
              })}
            </div>

            {tournamentKeys.length === 0 && (
              <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
                <Gamepad2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <div className="card-desc">No active tournaments. Data updates at 6 AM & 10 AM daily.</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
