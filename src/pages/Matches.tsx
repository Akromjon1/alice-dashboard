import { useEffect, useState } from 'react';
import { getMatches, addTeam, removeTeam } from '../api';
import { Trophy, Plus, Trash2, X, Shield } from 'lucide-react';

export default function Matches() {
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', league: '' });

  const refresh = () => {
    getMatches()
      .then(data => {
        setTeams(data.teams || []);
        setMatches(data.matches || []);
      })
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

  const handleRemove = async (name: string) => {
    await removeTeam(name);
    refresh();
  };

  const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Champions League', 'Europa League', 'MLS', 'Uzbekistan Super League', 'Other'];

  return (
    <>
      <div className="main-header">
        <Trophy size={20} /> Matches
      </div>
      <div className="main-content">
        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} /> Tracked Teams ({teams.length})
          </h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: '6px 14px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
            {showAdd ? 'Cancel' : 'Add Team'}
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ cursor: 'default', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                placeholder="Team name (e.g. Arsenal)"
                value={newTeam.name}
                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                style={{
                  flex: 1, minWidth: 180, padding: '10px 14px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                  fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                }}
              />
              <select
                value={newTeam.league}
                onChange={e => setNewTeam({ ...newTeam, league: e.target.value })}
                style={{
                  flex: 1, minWidth: 180, padding: '10px 14px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                  fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                }}
              >
                <option value="">Select league</option>
                {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={handleAdd}
                style={{
                  padding: '10px 20px', background: 'var(--green)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  fontFamily: 'Fira Sans, sans-serif',
                }}
              >Add</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-desc">Loading...</div>
        ) : teams.length === 0 ? (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <Trophy size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <div className="card-desc">No teams tracked yet. Add your favorite teams to get match updates!</div>
          </div>
        ) : (
          <div className="grid">
            {teams.map((team: any) => (
              <div key={team.name} className="card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={16} style={{ color: 'var(--accent)' }} />
                      {team.name}
                    </div>
                    {team.league && (
                      <span className="badge green" style={{ marginTop: 6, display: 'inline-block' }}>{team.league}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(team.name)}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Added: {team.addedAt}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Matches */}
        {matches.length > 0 && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 28, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} /> Recent Matches
            </h3>
            {matches.map((m: any, i: number) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{m.home}</div>
                  </div>
                  <div style={{
                    fontFamily: 'Fira Code, monospace', fontSize: 22, fontWeight: 700,
                    padding: '4px 16px', background: 'var(--border)', borderRadius: 8, minWidth: 80, textAlign: 'center',
                  }}>
                    {m.homeScore ?? '?'} — {m.awayScore ?? '?'}
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{m.away}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  {m.league} • {m.date} {m.time && `• ${m.time}`}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
