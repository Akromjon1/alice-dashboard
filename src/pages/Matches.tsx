import { useEffect, useState } from 'react';
import { getMatches, addTeam, getUfc } from '../api';
import { Trophy, Plus, X, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

type View = 'overview' | 'team-calendar' | 'tournament';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: 'var(--red-bg)', color: 'var(--red)', label: '● LIVE' },
  upcoming: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'UPCOMING' },
  completed: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'DONE' },
};

function VsCard({ left, right, label, time, date, status, accent, icon, clickLabel, onClick }: {
  left: string; right: string; label: string;
  time?: string; date?: string; status?: string; accent?: string;
  icon?: string; clickLabel?: string; onClick?: () => void;
}) {
  const st = STATUS_STYLES[status || 'upcoming'];
  return (
    <div className="card" style={{ cursor: onClick ? 'pointer' : 'default', marginBottom: 0, borderLeft: `3px solid ${accent || 'var(--accent)'}`, padding: 14 }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        {status && (
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
          {date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} /> {date.slice(5)}</span>}
          {time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {time}</span>}
        </div>
        {clickLabel && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>{clickLabel}</span>}
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

  const getNextMatch = (teamId: string) => {
    const matches = data.calendar?.[teamId] || [];
    return matches.find((m: any) => m.date >= today) || matches[0];
  };

  const getTournamentHighlight = (tournamentKey: string) => {
    const t = (data.tournaments || {})[tournamentKey];
    if (!t) return null;
    const todayMatches = (t.matches || []).filter((m: any) => m.date === today);
    if (todayMatches.length > 0) {
      return todayMatches.find((m: any) => m.status === 'live') || todayMatches[0];
    }
    return (t.matches || []).find((m: any) => m.date >= today);
  };

  const nextUfc = ufcEvents.filter(e => e.date >= today).slice(0, 2);

  // Group tournaments by game
  const tournaments = data.tournaments || {};
  const tournamentsByGame: Record<string, { key: string; data: any }[]> = {};
  Object.entries(tournaments).forEach(([key, t]: [string, any]) => {
    const game = t.game || 'Other';
    if (!tournamentsByGame[game]) tournamentsByGame[game] = [];
    tournamentsByGame[game].push({ key, data: t });
  });

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
                  <VsCard key={i} left={m.team1} right={m.team2} label={m.stage} time={m.time} date={m.date} status={m.status} accent={m.status === 'live' ? 'var(--red)' : 'var(--accent)'} />
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
            <VsCard key={i} left={m.home} right={m.away} label={m.competition} time={m.time} date={m.date} accent={m.date === today ? 'var(--red)' : m.competition.includes('UCL') || m.competition.includes('Carabao') || m.competition.includes('Clásico') || m.competition.includes('FA Cup') ? 'var(--yellow)' : 'var(--accent)'} />
          ))}
        </div>
      </>
    );
  }

  // OVERVIEW — sectioned by category
  return (
    <>
      <div className="main-header"><Trophy size={20} /> Matches</div>
      <div className="main-content">
        {loading ? <div className="card-desc">Loading...</div> : (
          <>
            {/* ⚽ FOOTBALL SECTION */}
            {(data.teams || []).length > 0 && (
              <>
                <SectionHeader icon="⚽" title="Football" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {(data.teams || []).map((team: any) => {
                    const next = getNextMatch(team.id);
                    if (!next) return null;
                    return (
                      <VsCard key={team.id} left={next.home} right={next.away} label={next.competition} icon={team.icon} time={next.time} date={next.date}
                        accent={next.date === today ? 'var(--red)' : 'var(--accent)'} status={next.date === today ? 'live' : 'upcoming'}
                        clickLabel="Calendar →" onClick={() => { setSelectedTeam(team.id); setView('team-calendar'); }} />
                    );
                  })}
                </div>
              </>
            )}

            {/* 🎯 CS2 SECTION */}
            {tournamentsByGame['CS2'] && tournamentsByGame['CS2'].length > 0 && (
              <>
                <SectionHeader icon="🎯" title="CS2" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {tournamentsByGame['CS2'].map(({ key, data: t }) => {
                    const match = getTournamentHighlight(key);
                    if (!match) return (
                      <div key={key} className="card" style={{ cursor: 'pointer', marginBottom: 0, borderLeft: '3px solid var(--yellow)', padding: 14 }} onClick={() => { setSelectedTournament(key); setView('tournament'); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{t.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{t.stage} • {t.dates}</div>
                        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6, textAlign: 'right' }}>Matches →</div>
                      </div>
                    );
                    return (
                      <VsCard key={key} left={match.team1} right={match.team2} label={t.name} icon={t.icon} time={match.time} date={match.date}
                        status={match.status} accent={match.status === 'live' ? 'var(--red)' : 'var(--yellow)'}
                        clickLabel="Matches →" onClick={() => { setSelectedTournament(key); setView('tournament'); }} />
                    );
                  })}
                </div>
              </>
            )}

            {/* ⚔️ DOTA 2 SECTION */}
            {tournamentsByGame['Dota 2'] && tournamentsByGame['Dota 2'].length > 0 && (
              <>
                <SectionHeader icon="⚔️" title="Dota 2" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {tournamentsByGame['Dota 2'].map(({ key, data: t }) => {
                    const match = getTournamentHighlight(key);
                    if (!match) return (
                      <div key={key} className="card" style={{ cursor: 'pointer', marginBottom: 0, borderLeft: '3px solid var(--yellow)', padding: 14 }} onClick={() => { setSelectedTournament(key); setView('tournament'); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{t.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{t.stage} • {t.dates}</div>
                        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6, textAlign: 'right' }}>Matches →</div>
                      </div>
                    );
                    return (
                      <VsCard key={key} left={match.team1} right={match.team2} label={t.name} icon={t.icon} time={match.time} date={match.date}
                        status={match.status} accent={match.status === 'live' ? 'var(--red)' : 'var(--yellow)'}
                        clickLabel="Matches →" onClick={() => { setSelectedTournament(key); setView('tournament'); }} />
                    );
                  })}
                </div>
              </>
            )}

            {/* 🥊 UFC SECTION */}
            {nextUfc.length > 0 && (
              <>
                <SectionHeader icon="🥊" title="UFC" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {nextUfc.map((evt, i) => {
                    const me = evt.mainEvent || {};
                    const hasFighters = me.fighter1 && me.fighter1 !== 'TBA';
                    return hasFighters ? (
                      <VsCard key={`ufc-${i}`} left={me.fighter1} right={me.fighter2} label={evt.event} icon="🥊" date={evt.date}
                        accent={evt.event.match(/UFC \d/) ? 'var(--yellow)' : 'var(--accent)'} status="upcoming" />
                    ) : (
                      <div key={`ufc-${i}`} className="card" style={{ cursor: 'default', marginBottom: 0, borderLeft: '3px solid var(--border)', padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>🥊 {evt.event}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{evt.location?.split(',')[0]} • {evt.date?.slice(5)}</div>
                          </div>
                          <span className="badge yellow">TBA</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Other game sections (dynamic) */}
            {Object.entries(tournamentsByGame)
              .filter(([game]) => game !== 'CS2' && game !== 'Dota 2')
              .map(([game, items]) => (
                <div key={game}>
                  <SectionHeader icon="🎮" title={game} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {items.map(({ key, data: t }) => {
                      const match = getTournamentHighlight(key);
                      if (!match) return null;
                      return (
                        <VsCard key={key} left={match.team1} right={match.team2} label={t.name} icon={t.icon} time={match.time} date={match.date}
                          status={match.status} accent={match.status === 'live' ? 'var(--red)' : 'var(--yellow)'}
                          clickLabel="Matches →" onClick={() => { setSelectedTournament(key); setView('tournament'); }} />
                      );
                    })}
                  </div>
                </div>
              ))}

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
