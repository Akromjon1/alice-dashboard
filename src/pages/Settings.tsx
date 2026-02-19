import { useState, useEffect } from 'react';
import { clearConfig, api } from '../api';
import { Cpu, Loader2, Plus, X, Save, Pencil } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import type { ModelRole } from '../types';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-opus-4-6', alias: 'opus', label: 'Claude Opus 4', tier: 'premium', icon: '🧠' },
  { id: 'anthropic/claude-sonnet-4-6', alias: 'sonnet', label: 'Claude Sonnet 4', tier: 'balanced', icon: '⚡' },
  { id: 'anthropic/claude-haiku-3-5', alias: 'haiku', label: 'Claude Haiku 3.5', tier: 'economy', icon: '🪶' },
  { id: 'ollama/qwen2.5:14b', alias: 'qwen', label: 'Qwen 2.5 14B', tier: 'local', icon: '🏠' },
  { id: 'ollama/qwen2.5-coder:14b', alias: 'qwen-coder', label: 'Qwen Coder 14B', tier: 'local', icon: '💻' },
];

const TIER_COLORS: Record<string, string> = {
  premium: 'var(--accent)', balanced: 'var(--yellow)', economy: 'var(--green)', local: 'var(--text-muted)',
};

const DEFAULT_ROLES: ModelRole[] = [
  { id: 'coding', name: 'Coding', description: 'Code generation, debugging, reviews', model: 'anthropic/claude-opus-4-6', icon: '💻' },
  { id: 'alice-main', name: 'Alice (Lead)', description: 'Main assistant, planning, coordination', model: 'anthropic/claude-sonnet-4-6', icon: '🤖' },
  { id: 'research', name: 'Research', description: 'Web search, data gathering, analysis', model: 'anthropic/claude-haiku-3-5', icon: '🔍' },
  { id: 'matches', name: 'Matches', description: 'Sports data fetching, updates', model: 'anthropic/claude-haiku-3-5', icon: '⚽' },
  { id: 'youtube', name: 'YouTube', description: 'Channel monitoring, video tracking', model: 'anthropic/claude-haiku-3-5', icon: '📺' },
  { id: 'cron', name: 'Cron Jobs', description: 'Scheduled tasks, heartbeats', model: 'anthropic/claude-haiku-3-5', icon: '⏰' },
];

function ModelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'Fira Code, monospace',
        cursor: 'pointer', outline: 'none', minWidth: 200,
      }}
    >
      {AVAILABLE_MODELS.map(m => (
        <option key={m.id} value={m.id}>{m.icon} {m.label} ({m.tier})</option>
      ))}
    </select>
  );
}

export default function Settings({ onLogout }: { onLogout: () => void }) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [roles, setRoles] = useState<ModelRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', model: 'anthropic/claude-haiku-3-5', icon: '🤖' });

  useEffect(() => {
    api.get('/api/model-roles').then((res: { roles?: ModelRole[] }) => {
      setRoles(res.roles?.length ? res.roles : DEFAULT_ROLES);
    }).catch(() => {
      setRoles(DEFAULT_ROLES);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.post('/api/model-roles', { roles: roles as unknown as Record<string, unknown>[] } as unknown as Record<string, unknown>);
      if (res.ok) {
        setSaveMsg({ ok: true, text: 'Model assignments saved!' });
        showToast('Model assignments saved!', 'success');
        setTimeout(() => setSaveMsg(null), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveMsg({ ok: false, text: msg });
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateRoleModel = (roleId: string, model: string) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, model } : r));
  };

  const updateRoleField = (roleId: string, field: keyof ModelRole, value: string) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, [field]: value } : r));
  };

  const removeRole = (roleId: string) => {
    setRoles(prev => prev.filter(r => r.id !== roleId));
  };

  const addRole = () => {
    if (!newRole.name) return;
    const id = newRole.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setRoles(prev => [...prev, { id, ...newRole }]);
    setNewRole({ name: '', description: '', model: 'anthropic/claude-haiku-3-5', icon: '🤖' });
    setShowAddRole(false);
  };

  // Count models usage
  const modelCounts: Record<string, number> = {};
  roles.forEach(r => { modelCounts[r.model] = (modelCounts[r.model] || 0) + 1; });

  const handleLogout = () => { clearConfig(); onLogout(); };

  return (
    <>
      <div className="main-header"><Cpu size={20} /> Settings</div>
      <div className="main-content">

        {/* Model Assignments */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                🤖 Agent Model Assignments
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Assign different AI models to each agent role. Opus for heavy lifting, Haiku for quick tasks.
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 16px', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Save
            </button>
          </div>

          {saveMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
              background: saveMsg.ok ? 'var(--green-bg)' : 'var(--red-bg)',
              color: saveMsg.ok ? 'var(--green)' : 'var(--red)',
            }}>
              {saveMsg.text}
            </div>
          )}

          {/* Model usage summary — non-interactive badges */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {AVAILABLE_MODELS.filter(m => modelCounts[m.id]).map(m => (
              <div key={m.id} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'Fira Code',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none',
              }}>
                <span>{m.icon}</span>
                <span style={{ fontWeight: 600 }}>{m.alias}</span>
                <span style={{ color: TIER_COLORS[m.tier], fontWeight: 700 }}>×{modelCounts[m.id]}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="card-desc">Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map(role => {
                const model = AVAILABLE_MODELS.find(m => m.id === role.model);
                const isEditing = editingRole === role.id;
                return (
                  <div key={role.id} className="card" style={{
                    cursor: 'default', marginBottom: 0, padding: '14px 16px',
                    borderLeft: `3px solid ${TIER_COLORS[model?.tier || 'economy']}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                        <span style={{ fontSize: 22 }}>{role.icon}</span>
                        <div style={{ flex: 1 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <input value={role.name} onChange={e => updateRoleField(role.id, 'name', e.target.value)}
                                style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontWeight: 700, width: 120, outline: 'none' }} />
                              <input value={role.description} onChange={e => updateRoleField(role.id, 'description', e.target.value)}
                                style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, flex: 1, minWidth: 150, outline: 'none' }} />
                            </div>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{role.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{role.description}</div>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ModelSelect value={role.model} onChange={v => updateRoleModel(role.id, v)} />
                        <button onClick={() => setEditingRole(isEditing ? null : role.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
                        }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => removeRole(role.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4,
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add role */}
              {!showAddRole ? (
                <button onClick={() => setShowAddRole(true)} style={{
                  padding: '10px 16px', background: 'var(--bg-card)', border: '1px dashed var(--border)',
                  borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans',
                }}>
                  <Plus size={14} /> Add Role
                </button>
              ) : (
                <div className="card" style={{ cursor: 'default', marginBottom: 0, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input placeholder="Icon" value={newRole.icon} onChange={e => setNewRole({ ...newRole, icon: e.target.value })}
                      style={{ width: 50, padding: '8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 18, textAlign: 'center', outline: 'none' }} />
                    <input placeholder="Role name" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                      style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                    <input placeholder="Description" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                      style={{ flex: 2, minWidth: 150, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                    <ModelSelect value={newRole.model} onChange={v => setNewRole({ ...newRole, model: v })} />
                    <button onClick={addRole} style={{ padding: '8px 16px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Add</button>
                    <button onClick={() => setShowAddRole(false)} style={{ padding: '8px 10px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔌 Connection
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-desc" style={{ marginBottom: 16, fontSize: 13 }}>
              Disconnect from the current gateway and return to login.
            </div>
            {confirming ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Yes, disconnect</button>
                <button onClick={() => setConfirming(false)} style={{ padding: '8px 16px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} style={{ padding: '8px 16px', background: 'var(--bg)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Disconnect</button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
