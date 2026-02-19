interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, width: 400, boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 10, fontFamily: 'Fira Code, monospace', fontSize: 16 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '10px 20px', background: 'var(--border)', color: 'var(--text)',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif',
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '10px 20px', background: danger ? 'var(--red)' : 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif', fontWeight: 600,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
