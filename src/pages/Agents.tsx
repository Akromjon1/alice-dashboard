import { useState } from 'react';
import { sendChat } from '../api';
import { Send, Bot } from 'lucide-react';

export default function Agents() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const msg = input;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);
    try {
      const res = await sendChat(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: res.result?.text || 'Message sent to Alice' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Failed to send' }]);
    }
    setSending(false);
  };

  return (
    <>
      <div className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={20} /> Chat with Alice
        </div>
      </div>
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
                Send a message to Alice...
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="bubble">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message..."
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
