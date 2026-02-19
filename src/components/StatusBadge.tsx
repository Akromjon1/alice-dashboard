interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { className: string; color: string }> = {
  running: { className: 'status-running', color: 'var(--green)' },
  ready: { className: 'status-ready', color: 'var(--green)' },
  standby: { className: 'status-standby', color: 'var(--yellow)' },
  stopped: { className: 'status-stopped', color: 'var(--text-muted)' },
  live: { className: 'status-running', color: 'var(--red)' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.stopped;

  return (
    <span className={config.className} style={{
      fontSize: 11, fontWeight: 500, color: config.color,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {status}
    </span>
  );
}
