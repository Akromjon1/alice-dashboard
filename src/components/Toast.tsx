import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const TYPE_STYLES: Record<ToastType, { bg: string; color: string; border: string }> = {
  success: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green)' },
  error: { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red)' },
  info: { bg: 'var(--accent-glow)', color: 'var(--accent)', border: 'var(--accent)' },
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(toast => {
        const style = TYPE_STYLES[toast.type];
        return (
          <div key={toast.id} style={{
            padding: '12px 16px', borderRadius: 10, minWidth: 280, maxWidth: 400,
            background: 'var(--bg-card)', border: `1px solid ${style.border}`,
            borderLeft: `4px solid ${style.border}`,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'toastSlideIn 0.25s ease-out',
            fontSize: 13, color: style.color,
          }}>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => onDismiss(toast.id)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 2, flexShrink: 0,
            }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
