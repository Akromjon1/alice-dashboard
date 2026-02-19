import { useState, useEffect } from 'react';
import { clearConfig, api } from '../api';
import { Cpu, Check, Loader2 } from 'lucide-react';

const MODELS = [
  { id: 'anthropic/claude-opus-4-6', alias: 'opus', label: 'Claude Opus 4', tier: 'premium', desc: 'Most capable, deep reasoning', icon: '🧠', color: 'var(--accent)' },
  { id: 'anthropic/claude-sonnet-4-6', alias: 'sonnet', label: 'Claude Sonnet 4', tier: 'balanced', desc: 'Fast & capable, good balance', icon: '⚡', color: 'var(--yellow)' },
  { id: 'anthropic/claude-haiku-3-5', alias: 'haiku', label: 'Claude Haiku 3.5', tier: 'economy', desc: 'Cheapest, quick tasks', icon: '🪶', color: 'var(--green)' },
  { id: 'ollama/qwen2.5:14b', alias: 'qwen', label: 'Qwen 2.5 14B', tier: 'local', desc: 'Free, runs locally on Mac mini', icon: '🏠', color: 'var(--text-muted)' },
  { id: 'ollama/qwen2.5-coder:14b', alias: 'qwen-coder', label: 'Qwen 2.5 Coder 14B', tier: 'local', desc: 'Free, code-focused local model', icon: '💻', color: 'var(--text-muted)' },
];

const TIER_BADGES: Record<string, { bg: string; color: string }> = {
  premium: { bg: 'var(--accent-glow)', color: 'var(--accent)' },
  balanced: { bg: 'var(--yellow-bg)', color: 'var(--yellow)' },
  economy: { bg: 'var(--green-bg)', color: 'var(--green)' },
  local: { bg: 'var(--border)', color: 'var(--text-muted)' },
};

export default function Settings({ onLogout }: { onLogout: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [currentModel, setCurrentModel] = useState('');
  const [switching, setSwitching] = useState('');
  const [modelStatus, setModelStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    api.get('/api/model').then(res => {
      if (res.model) setCurrentModel(res.model);
    }).catch(() => {});
  }, []);

  const handleModelSwitch = async (modelId: string) => {
    if (modelId === currentModel) return;
    setSwitching(modelId);
    setModelStatus(null);
    try {
      const res = await api.post('/api/model', { model: modelId });
      if (res.ok) {
        setCurrentModel(modelId);
        setModelStatus({ success: true, message: `Switched to ${MODELS.find(m => m.id === modelId)?.label || modelId}` });
      } else {
        setModelStatus({ success: false, message: res.error || 'Failed to switch' });
      }
    } catch (err: any) {
      setModelStatus({ success: false, message: err.message || 'Failed to switch model' });
    } finally {
      setSwitching('');
    }
  };

  const handleLogout = () => {
    clearConfig();
    onLogout();
  };

  return (
    <>
      <div className="main-header"><Cpu size={20} /> Settings</div>
      <div className="main-content">

        {/* Model Management */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤖</span> AI Model
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Choose the default model for Alice. Affects all new conversations.
          </div>

          {modelStatus && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
              background: modelStatus.success ? 'var(--green-bg)' : 'var(--red-bg)',
              color: modelStatus.success ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${modelStatus.success ? 'var(--green)' : 'var(--red)'}`,
            }}>
              {modelStatus.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODELS.map(model => {
              const isActive = currentModel === model.id;
              const isSwitching = switching === model.id;
              const badge = TIER_BADGES[model.tier];
              return (
                <div
                  key={model.id}
                  onClick={() => !isSwitching && handleModelSwitch(model.id)}
                  className="card"
                  style={{
                    cursor: isSwitching ? 'wait' : 'pointer',
                    marginBottom: 0,
                    borderLeft: `3px solid ${isActive ? model.color : 'transparent'}`,
                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-card)',
                    padding: '14px 16px',
                    transition: 'all 0.2s',
                    opacity: isSwitching ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{model.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{model.label}</span>
                          <span style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 4,
                            background: badge.bg, color: badge.color,
                            fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Fira Code',
                          }}>
                            {model.tier}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{model.desc}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code', marginTop: 2, opacity: 0.6 }}>{model.id}</div>
                      </div>
                    </div>
                    <div>
                      {isSwitching && <Loader2 size={18} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />}
                      {isActive && !isSwitching && <Check size={18} style={{ color: 'var(--green)' }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔌</span> Connection
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div className="card-desc" style={{ marginBottom: 16, fontSize: 13 }}>
              Disconnect from the current gateway and return to login.
            </div>
            {confirming ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  Yes, disconnect
                </button>
                <button onClick={() => setConfirming(false)} style={{ padding: '8px 16px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} style={{ padding: '8px 16px', background: 'var(--bg)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
