interface KeyboardShortcutsProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'N', description: 'New Task (Mission Control)' },
  { key: 'Esc', description: 'Close any modal/dialog' },
  { key: '?', description: 'Show this help' },
];

export default function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, width: 380, boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 20, fontFamily: 'Fira Code, monospace', fontSize: 16 }}>⌨️ Keyboard Shortcuts</h3>
        {shortcuts.map(s => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.description}</span>
            <kbd style={{
              padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, fontSize: 13, fontFamily: 'Fira Code, monospace', fontWeight: 600,
              color: 'var(--text)',
            }}>{s.key}</kbd>
          </div>
        ))}
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', background: 'var(--border)', color: 'var(--text)',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Fira Sans, sans-serif',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}
