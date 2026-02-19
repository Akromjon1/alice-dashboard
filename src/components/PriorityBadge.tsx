interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
}

const PRIORITY_CONFIG: Record<string, { className: string; color: string }> = {
  high: { className: 'priority-high', color: 'var(--red)' },
  medium: { className: 'priority-medium', color: 'var(--yellow)' },
  low: { className: 'priority-low', color: 'var(--green)' },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <span className={config.className} style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
      color: config.color,
    }}>
      {priority}
    </span>
  );
}
