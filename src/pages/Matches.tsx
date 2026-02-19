import { useEffect, useState } from 'react';
import { getMatches, addTeam } from '../api';
import { Trophy, Plus, X, Shield, ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';

type View = 'overview' | 'team-calendar';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: 'var(--red-bg)', color: 'var(--red)', label: '● LIVE' },
  upcoming: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'UPCOMING' },
  completed: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'DONE' },
};

const CATEGORY_ICONS: Record<string, string> = {
  cs2: '🎯',
  dota2: '⚔️',
  epl: '⚽',
  ucl: '🏆',
};

const CATEGORY_NAMES: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  epl: 'Premier League',
  ucl: 'Champions League',
};

export default function Matches() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });

  const refresh = () => {
    getMatches()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!newTeam.name) return;
    await addTeam(newTeam.name, newTeam.league);
    setNewTeam({ name: '', league: '' });
    setShowAdd(false);
    refresh();
  };

  const openTeamCalendar = (teamId: string) => {
    setSelectedTeam(teamId);
    setView('team-calendar');
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const calendarMatches = data.calendar?.[selectedTeam] || [];
  const matchDates = new Set(calendarMatches.map((m: any) => m.date));

  const getMatchForDate = (dateStr: string) => calendarMatches.filter((m: any) => m.date === dateStr);

  const today = new Date().toISOString().split('T')[0];

  if (view === 'team-calendar') {
    const days = getDaysInMonth(calendarMonth.year, calendarMonth.month);
    const firstDay = getFirstDayOfMonth(calendarMonth.year, calendarMonth.month);
    const teamName = selectedTeam === 'real-madrid' ? 'Real Madrid' : selectedTeam;

    return (
      <>
        <div className="main-header" style={{ gap: 12 }}>
          <ChevronLeft size={20} style={{ cursor: 'pointer' }} onClick={() => setView('overview')} />
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          {teamName} — Calendar
        </div>
        <div className="main-content">
          {/* Month navigation */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, padding: '12px 16px', background: 'var(--bg-card)',
            borderRadius: 10, border: '1px solid var(--border)',
          }}>
            <button onClick={() => setCalendarMonth(prev => {
              const d = new Date(prev.year, prev.month - 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700 }}>
              {monthNames[calendarMonth.month]} {calendarMonth.year}
            </span>
            <button onClick={() => setCalendarMonth(prev => {
              const d = new Date(prev.year, prev.month + 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
            marginBottom: 24,
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 600,
                color: 'var(--text-muted)', padding: '8px 0', textTransform: 'uppercase',
              }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1;
              const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasMatch = matchDates.has(dateStr);
              const isToday = dateStr === today;
              const dayMatches = getMatchForDate(dateStr);

              return (
                <div key={day} style={{
                  padding: '8px 4px', borderRadius: 8, textAlign: 'center',
                  background: hasMatch ? 'var(--accent-glow)' : isToday ? 'var(--border)' : 'transparent',
                  border: isToday ? '2px solid var(--accent)' : hasMatch ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: hasMatch ? 'pointer' : 'default',
                  minHeight: 70, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                  title={dayMatches.map((m: any) => `${m.home} vs ${m.away}`).join('\n')}
                >
                  <div style={{
                    fontSize: 14, fontWeight: isToday ? 700 : hasMatch ? 600 : 400,
                    color: hasMatch ? 'var(--accent)' : isToday ? 'var(--text)' : 'var(--text-secondary)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {hasMatch && dayMatches.map((m: any, mi: number) => (
                    <div key={mi} style={{
                      fontSize: 9, fontWeight: 600, color: 'var(--accent)',
                      background: 'var(--accent-glow)', borderRadius: 4, padding: '1px 4px',
                      marginTop: 2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.competition === 'La Liga' ? 'Liga' : m.competition?.slice(0, 8)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Upcoming matches list */}
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>All Fixtures</h3>
          {calendarMatches.map((m: any, i: number) => {
            const isPast = m.date < today;
            const isMatchToday = m.date === today;
            return (
              <div key={i} className="card" style={{
                cursor: 'default', opacity: isPast ? 0.5 : 1,
                borderLeft: isMatchToday ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge ${m.competition.includes('UCL') ? 'yellow' : 'green'}`}>
                        {m.competition}
                      </span>
                      {isMatchToday && <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>TODAY</span>}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {m.home} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.away}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> {m.date}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {m.time} GMT+5
                      </span>
                      {m.venue && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {m.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // Overview
  const todayMatches = data.todayMatches || {};
  const categories = Object.keys(todayMatches);

  return (
    <>
      <div className="main-header">
        <Trophy size={20} /> Matches
      </div>
      <div className="main-content">
        {loading ? <div className="card-desc">Loading...</div> : (
          <>
            {/* Teams strip */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
              {(data.teams || []).map((team: any) => (
                <div key={team.name} onClick={() => openTeamCalendar(team.name.toLowerCase().replace(/\s+/g, '-'))}
                  className="card" style={{
                    cursor: 'pointer', padding: '14px 20px', minWidth: 160, marginBottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  }}>
                  <Shield size={28} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{team.league}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>View Calendar →</div>
                </div>
              ))}
              <div onClick={() => setShowAdd(true)} className="card" style={{
                cursor: 'pointer', padding: '14px 20px', minWidth: 120, marginBottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed var(--border)',
              }}>
                <Plus size={24} style={{ color: 'var(--text-muted)' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Add Team</div>
              </div>
            </div>

            {/* Add team modal */}
            {showAdd && (
              <div className="card" style={{ cursor: 'default', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input placeholder="Team name" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                    style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none' }} />
                  <input placeholder="League" value={newTeam.league} onChange={e => setNewTeam({ ...newTeam, league: e.target.value })}
                    style={{ flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none' }} />
                  <button onClick={handleAdd} style={{ padding: '10px 20px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans' }}>Add</button>
                  <button onClick={() => setShowAdd(false)} style={{ padding: '10px 12px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><X size={16} /></button>
                </div>
              </div>
            )}

            {/* Today's matches by category */}
            {categories.length === 0 ? (
              <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
                <Trophy size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <div className="card-desc">No matches data yet. Wait for the 6 AM cron job or ask Alice to fetch.</div>
              </div>
            ) : (
              categories.map(cat => {
                const matches = todayMatches[cat] || [];
                if (matches.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: 28 }}>
                    <h3 style={{
                      fontSize: 14, fontWeight: 700, marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: 'var(--text)',
                    }}>
                      <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat] || '🎮'}</span>
                      {CATEGORY_NAMES[cat] || cat}
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                        ({matches.length})
                      </span>
                    </h3>
                    {matches.map((m: any, i: number) => {
                      const st = STATUS_STYLES[m.status] || STATUS_STYLES.upcoming;
                      return (
                        <div key={i} className="card" style={{ cursor: 'default', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 700, fontFamily: 'Fira Code, monospace' }}>
                                  {st.label}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.tournament}</span>
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 700 }}>
                                {m.team1} <span style={{ color: 'var(--text-muted)', fontWeight: 400, margin: '0 6px' }}>vs</span> {m.team2}
                              </div>
                              {m.score && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{m.score}</div>}
                            </div>
                            <div style={{
                              fontFamily: 'Fira Code, monospace', fontSize: 14, fontWeight: 600,
                              color: 'var(--text-muted)', textAlign: 'right',
                            }}>
                              <div>{m.date}</div>
                              <div style={{ fontSize: 16, color: 'var(--text)' }}>{m.time}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </>
  );
}
