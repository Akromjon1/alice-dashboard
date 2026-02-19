import { useEffect, useState } from 'react';
import { getAgents, sendChat } from '../api';
import { Bot, Send, Activity, Eye, Pause, Play, MessageSquare, ArrowRight, Zap, Shield } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  lastActive: string;
  model?: string;
  modelTier?: string;
  icon?: string;
  isPipeline?: boolean;
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'opus': return 'var(--accent)';
    case 'sonnet': return 'var(--yellow)';
    case 'haiku': return 'var(--green)';
    default: return 'var(--text-muted)';
  }
}

function tierBgColor(tier: string): string {
  switch (tier) {
    case 'opus': return 'var(--accent-bg, rgba(139,92,246,0.12))';
    case 'sonnet': return 'var(--yellow-bg, rgba(234,179,8,0.12))';
    case 'haiku': return 'var(--green-bg, rgba(34,197,94,0.12))';
    default: return 'rgba(128,128,128,0.12)';
  }
}

const pipelineSteps = [
  { id: 'alice-main', label: 'Alice', subtitle: 'Lead', icon: '🤖', tier: 'sonnet' },
  { id: 'coding', label: 'Coder', subtitle: 'Code Gen', icon: '💻', tier: 'opus' },
  { id: 'tester', label: 'QA Tester', subtitle: 'Review', icon: '🧪', tier: 'sonnet' },
];

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAgents()
      .then(data => setAgents(data.agents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const msg = input;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);
    try {
      const res = await sendChat(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: res.result?.text || '✓ Sent to Alice' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Failed to send' }]);
    }
    setSending(false);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'running' || status === 'ready') return <Play size={14} style={{ color: 'var(--green)' }} />;
    if (status === 'stopped') return <Pause size={14} style={{ color: 'var(--text-muted)' }} />;
    if (status === 'standby') return <Shield size={14} style={{ color: 'var(--yellow)' }} />;
    return <Activity size={14} style={{ color: 'var(--yellow)' }} />;
  };

  const getStatusLabel = (status: string) => {
    const colors: Record<string, string> = {
      running: 'var(--green)',
      ready: 'var(--green)',
      standby: 'var(--yellow)',
      stopped: 'var(--text-muted)',
    };
    return (
      <span style={{
        fontSize: 11, fontWeight: 500, color: colors[status] || 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {status}
      </span>
    );
  };

  // Separate pipeline agents from utility agents
  const pipelineIds = new Set(['alice-main', 'coding', 'tester']);
  const pipelineAgents = agents.filter(a => pipelineIds.has(a.id));

  return (
    <>
      <div className="main-header">
        <Bot size={20} /> Agents
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              padding: '6px 14px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}
          >
            <MessageSquare size={14} /> Chat with Alice
          </button>
        </div>
      </div>
      <div className="main-content">
        {loading ? (
          <div className="card-desc">Loading agents...</div>
        ) : (
          <>
            {/* Pipeline Section */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                Dev Pipeline
              </div>
              <div className="card" style={{ cursor: 'default', padding: 24 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 0, flexWrap: 'wrap',
                }}>
                  {pipelineSteps.map((step, i) => {
                    const agent = pipelineAgents.find(a => a.id === step.id);
                    return (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          padding: '16px 24px', borderRadius: 12,
                          background: tierBgColor(step.tier),
                          border: `1px solid ${tierColor(step.tier)}33`,
                          minWidth: 130,
                        }}>
                          <span style={{ fontSize: 28, marginBottom: 6 }}>{step.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{step.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{step.subtitle}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, fontFamily: 'Fira Code, monospace',
                            padding: '2px 8px', borderRadius: 4,
                            background: tierBgColor(step.tier),
                            color: tierColor(step.tier),
                            border: `1px solid ${tierColor(step.tier)}44`,
                          }}>
                            {step.tier}
                          </span>
                          {agent && (
                            <div style={{ marginTop: 6 }}>
                              {getStatusLabel(agent.status)}
                            </div>
                          )}
                        </div>
                        {i < pipelineSteps.length - 1 && (
                          <ArrowRight size={20} style={{ color: 'var(--text-muted)', margin: '0 8px', flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  marginTop: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}>
                  Alice orchestrates → Coder writes code → QA validates → repeat up to 3 rounds
                </div>
              </div>
            </div>

            {/* All Agents Grid */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              <Bot size={14} />
              All Agents ({agents.length})
            </div>
            <div className="grid">
              {agents.map((agent) => {
                const tier = agent.modelTier || 'local';
                return (
                  <div key={agent.id} className="card" style={{ cursor: 'default' }}>
                    <div className="card-header">
                      <div className="card-title" style={{ textTransform: 'none', letterSpacing: 0 }}>
                        {agent.icon && <span style={{ fontSize: 18, marginRight: 4 }}>{agent.icon}</span>}
                        {getStatusIcon(agent.status)}
                        <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{agent.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {agent.modelTier && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, fontFamily: 'Fira Code, monospace',
                            padding: '2px 8px', borderRadius: 4,
                            background: tierBgColor(tier),
                            color: tierColor(tier),
                            border: `1px solid ${tierColor(tier)}44`,
                          }}>
                            {tier}
                          </span>
                        )}
                        <span className={`badge ${agent.type === 'main' ? 'green' : agent.type === 'pipeline' ? 'green' : agent.type === 'watcher' ? 'yellow' : 'green'}`}>
                          {agent.type}
                        </span>
                      </div>
                    </div>
                    <div className="card-desc" style={{ marginBottom: 8 }}>{agent.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Eye size={12} />
                        {agent.lastActive === 'continuous' ? 'Always active' : `Last: ${agent.lastActive}`}
                      </div>
                      {getStatusLabel(agent.status)}
                    </div>
                  </div>
                );
              })}
            </div>

            {agents.length === 0 && (
              <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
                <Bot size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <div className="card-desc">No agents found</div>
              </div>
            )}
          </>
        )}

        {/* Chat Panel */}
        {chatOpen && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Quick Chat</h3>
            <div className="card" style={{ cursor: 'default', padding: 20 }}>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 14 }}>
                    Send a command to Alice...
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="e.g. check my stocks, what's new on YouTube..."
                  disabled={sending}
                />
                <button onClick={send} disabled={sending}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
