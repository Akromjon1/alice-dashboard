import { useEffect, useState } from 'react';
import { getSessionsList, getSessionHistory, sendToSession } from '../api';
import { Bot, Send, ArrowLeft } from 'lucide-react';
import { Message } from '../types';

export default function Agents() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getSessionsList()
      .then(data => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openChat = async (sessionKey: string) => {
    setSelected(sessionKey);
    try {
      const data = await getSessionHistory(sessionKey);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const send = async () => {
    if (!input.trim() || !selected) return;
    setSending(true);
    try {
      await sendToSession(selected, input);
      setInput('');
      // Refresh messages
      const data = await getSessionHistory(selected);
      setMessages(data.messages || []);
    } catch {}
    setSending(false);
  };

  if (selected) {
    const session = sessions.find(s => s.sessionKey === selected);
    return (
      <>
        <div className="main-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ArrowLeft size={18} style={{ cursor: 'pointer' }} onClick={() => setSelected(null)} />
          {session?.label || selected}
        </div>
        <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  <div className="bubble">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Send a message..."
                disabled={sending}
              />
              <button onClick={send} disabled={sending}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="main-header">Agents & Sessions</div>
      <div className="main-content">
        {loading ? (
          <div className="card-desc">Loading...</div>
        ) : (
          <div className="grid">
            {sessions.map((s: any) => (
              <div key={s.sessionKey} className="card" onClick={() => openChat(s.sessionKey)}>
                <div className="card-header">
                  <div className="card-title">
                    <Bot size={16} />
                    {s.label || s.sessionKey}
                  </div>
                  <span className={`badge ${s.kind === 'ended' ? 'red' : 'green'}`}>
                    {s.kind || 'active'}
                  </span>
                </div>
                <div className="card-desc">
                  {s.lastMessages?.[0]?.content?.slice(0, 80) || 'No recent messages'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
