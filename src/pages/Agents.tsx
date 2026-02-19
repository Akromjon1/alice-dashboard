import { useEffect, useState } from 'react';
import { getAgents, sendChat } from '../api';
import { Bot, Send, Activity, Eye, Pause, Play, MessageSquare } from 'lucide-react';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
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
    if (status === 'running') return <Play size={14} style={{ color: 'var(--green)' }} />;
    if (status === 'stopped') return <Pause size={14} style={{ color: 'var(--text-muted)' }} />;
    return <Activity size={14} style={{ color: 'var(--yellow)' }} />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'green';
      case 'watcher': return 'yellow';
      case 'system': return 'green';
      default: return 'green';
    }
  };

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
        {/* Agent Cards */}
        {loading ? (
          <div className="card-desc">Loading agents...</div>
        ) : (
          <>
            <div className="grid">
              {agents.map((agent: any) => (
                <div key={agent.id} className="card" style={{ cursor: 'default' }}>
                  <div className="card-header">
                    <div className="card-title" style={{ textTransform: 'none', letterSpacing: 0 }}>
                      {getStatusIcon(agent.status)}
                      <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{agent.name}</span>
                    </div>
                    <span className={`badge ${getTypeColor(agent.type)}`}>{agent.type}</span>
                  </div>
                  <div className="card-desc" style={{ marginBottom: 8 }}>{agent.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Eye size={12} />
                    Last active: {agent.lastActive}
                  </div>
                </div>
              ))}
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
