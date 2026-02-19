import { useEffect, useState } from 'react';
import { getMatches, addTeam, getUfc } from '../api';
import { Trophy, Plus, X, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

type View = 'overview' | 'team-calendar' | 'tournament';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: 'var(--red-bg)', color: 'var(--red)', label: '● LIVE' },
  upcoming: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'UPCOMING' },
  completed: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'DONE' },
};

function VsCard({ left, right, label, sublabel, time, date, status, accent }: {
  left: string; right: string; label: string; sublabel?: string;
  time?: string; date?: string; status?: string; accent?: string;
}) {
  const st = STATUS_STYLES[status || 'upcoming'];
  return (
    <div className="card" style={{ cursor: 'default', marginBottom: 12, borderLeft: `3px solid ${accent || 'var(--accent)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
          {sublabel && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {sublabel}</span>}
        </div>
        {status && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 700, fontFamily: 'Fira Code, monospace' }}>
            {st.label}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 0' }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{left}</div>
        </div>
        <div style={{
          fontFamily: 'Fira Code, monospace', fontSize: 11, fontWeight: 700,
          color: 'var(--red)', padding: '4px 10px', background: 'var(--red-bg)',
          borderRadius: 6,
        }}>VS</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{right}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {date}</span>}
        {time && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {time} GMT+5</span>}
      </div>
    </div>
  );
}

export default function Matches() {
  const [data, setData] = useState<any>({});
  const [ufcEvents, setUfcEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });

  const refresh = () => {
    Promise.all([
      getMatches().catch(() => ({})),
      getUfc().catch(() => ({ events: [] })),
    ]).then(([d, u]) => {
      setData(d);
      setUfcEvents(u.events || []);
    }).finally(() => setLoading(false));
  };
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

  // Get next match for a team
  const getNextMatch = (teamId: string) => {
    const matches = data.calendar?.[teamId] || [];
    return matches.find((m: any) => m.date >= today) || matches[0];
  };

  // Get main match of the day for a tournament
  const getTournamentHighlight = (tournamentKey: string) => {
    const t = (data.tournaments || {})[tournamentKey];
    if (!t) return null;
    // Find today's live match, or next upcoming
    const todayMatches = (t.matches || []).filter((m: any) => m.date === today);
    if (todayMatches.length > 0) {
      // Prefer live, then first upcoming
      return todayMatches.find((m: any) => m.status === 'live') || todayMatches[0];
    }
    return (t.matches || []).find((m: any) => m.date >= today);
  };

  // Get next 2 UFC events
  const nextUfc = ufcEvents.filter(e => e.date >= today).slice(0, 2);

  // TOURNAMENT VIEW
  if (view === 'tournament') {
    const t = (data.tournaments || {})[selectedTournament];
    if (!t) return <div className="main-content"><div className="card-desc">Tournament not found</div></div>;

    return (
      <>
        <div className="main-header" style={{ gap: 12 }}>
          <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => setView('overview')} />
          <span style={{ fontSize: 20 }}>{t.icon}</span> {t.name}
        </div>
        <div className="main-content">
          <div className="card" style={{ cursor: 'default', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Game</div><div style={{ fontWeight: 600 }}>{t.game}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Dates</div><div style={{ fontWeight: 600 }}>{t.dates}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Prize</div><div style={{ fontWeight: 600, color: 'var(--green)' }}>{t.prize}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Stage</div><span className={`badge ${t.status === 'live' ? 'red' : 'green'}`}>{t.stage}</span></div>
            </div>
          </div>
          {t.standings && Object.entries(t.standings).map(([groupName, teams]: [string, any]) => (
            <div key={groupName} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{groupName.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="card" style={{ cursor: 'default', padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Team</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>W-D-L</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Pts</th>
                  </tr></thead>
                  <tbody>{teams.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i < 4 ? 'var(--green-bg)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: i < 4 ? 'var(--green)' : 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.team}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'Fira Code', fontSize: 12 }}>{row.record}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'Fira Code', fontSize: 12, fontWeight: 700 }}>{row.points}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Matches</h3>
          {(() => {
            const grouped: Record<string, any[]> = {};
            (t.matches || []).forEach((m: any) => { (grouped[m.date] = grouped[m.date] || []).push(m); });
            return Object.entries(grouped).map(([date, ms]) => (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: date === today ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={12} /> {date} {date === today && <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>TODAY</span>}
                </div>
                {ms.map((m: any, i: number) => (
                  <VsCard key={i} left={m.team1} right={m.team2} label={m.stage} sublabel={m.format} time={m.time} date={m.date} status={m.status} accent={m.status === 'live' ? 'var(--red)' : 'var(--accent)'} />
                ))}
              </div>
            ));
          })()}
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

    return (
      <>
        <div className="main-header" style={{ gap: 12 }}>
          <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => setView('overview')} />
          <span style={{ fontSize: 20 }}>{teamObj?.icon || '⚽'}</span> {teamObj?.name || selectedTeam} — Calendar
        </div>
        <div className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <button onClick={() => setCalendarMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}><ChevronLeft size={20} /></button>
            <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700 }}>{monthNames[calendarMonth.month]} {calendarMonth.year}</span>
            <button onClick={() => setCalendarMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}><ChevronRight size={20} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '8px 0' }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasMatch = matchDates.has(dateStr);
              const isToday = dateStr === today;
              const dayMatches = getMatchForDate(dateStr);
              return (
                <div key={day} style={{ padding: '8px 4px', borderRadius: 8, textAlign: 'center', minHeight: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', background: hasMatch ? 'var(--accent-glow)' : isToday ? 'var(--border)' : 'transparent', border: isToday ? '2px solid var(--accent)' : hasMatch ? '1px solid var(--accent)' : '1px solid transparent' }}>
                  <div style={{ fontSize: 14, fontWeight: isToday ? 700 : hasMatch ? 600 : 400, color: hasMatch ? 'var(--accent)' : isToday ? 'var(--text)' : 'var(--text-secondary)', marginBottom: 4 }}>{day}</div>
                  {dayMatches.map((m: any, mi: number) => (
                    <div key={mi} style={{ fontSize: 8, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-glow)', borderRadius: 3, padding: '1px 4px', marginTop: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.competition.slice(0, 12)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>All Fixtures</h3>
          {calendarMatches.map((m: any, i: number) => (
            <VsCard key={i} left={m.home} right={m.away} label={m.competition} sublabel={m.venue} time={m.time} date={m.date} accent={m.date === today ? 'var(--red)' : m.competition.includes('UCL') || m.competition.includes('Carabao') || m.competition.includes('Clásico') || m.competition.includes('FA Cup') ? 'var(--yellow)' : 'var(--accent)'} />
          ))}
        </div>
      </>
    );
  }

  // OVERVIEW — compact highlights
  const tournaments = data.tournaments || {};
  const tournamentKeys = Object.keys(tournaments);

  return (
    <>
      <div className="main-header"><Trophy size={20} /> Matches</div>
      <div className="main-content">
        {loading ? <div className="card-desc">Loading...</div> : (
          <>
            {/* Next team matches */}
            {(data.teams || []).map((team: any) => {
              const next = getNextMatch(team.id);
              if (!next) return null;
              return (
                <div key={team.id} style={{ marginBottom: 4 }}>
                  <div onClick={() => { setSelectedTeam(team.id); setView('team-calendar'); }}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{team.icon}</span> {team.name}
                    <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 'auto', fontWeight: 500 }}>Full calendar →</span>
                  </div>
                  <VsCard left={next.home} right={next.away} label={next.competition} sublabel={next.venue} time={next.time} date={next.date} accent={next.date === today ? 'var(--red)' : 'var(--accent)'} status={next.date === today ? 'live' : 'upcoming'} />
                </div>
              );
            })}

            {/* Esports highlights */}
            {tournamentKeys.map(key => {
              const t = tournaments[key];
              const match = getTournamentHighlight(key);
              if (!match) return null;
              return (
                <div key={key} style={{ marginBottom: 4 }}>
                  <div onClick={() => { setSelectedTournament(key); setView('tournament'); }}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span> {t.name}
                    {t.status === 'live' && <span className="badge red" style={{ fontSize: 9 }}>LIVE</span>}
                    <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 'auto', fontWeight: 500 }}>All matches →</span>
                  </div>
                  <VsCard left={match.team1} right={match.team2} label={match.stage} sublabel={`${t.game} • ${match.format}`} time={match.time} date={match.date} status={match.status} accent={match.status === 'live' ? 'var(--red)' : 'var(--yellow)'} />
                </div>
              );
            })}

            {/* UFC — next 2 */}
            {nextUfc.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🥊 UFC
                </div>
                {nextUfc.map((evt, i) => {
                  const me = evt.mainEvent || {};
                  const hasFighters = me.fighter1 && me.fighter1 !== 'TBA';
                  return hasFighters ? (
                    <VsCard key={i} left={me.fighter1} right={me.fighter2} label={evt.event} sublabel={me.weightClass} date={evt.date} accent={evt.event.match(/UFC \d/) ? 'var(--yellow)' : 'var(--accent)'} status="upcoming" />
                  ) : (
                    <div key={i} className="card" style={{ cursor: 'default', marginBottom: 12, borderLeft: '3px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{evt.event}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{evt.location.split(',')[0]} • {evt.date}</div>
                        </div>
                        <span className="badge yellow">TBA</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add team */}
            <div style={{ marginTop: 16 }}>
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
