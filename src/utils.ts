export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function getModelTier(model: string): string {
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return 'local';
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'opus': return 'var(--accent)';
    case 'sonnet': return 'var(--yellow)';
    case 'haiku': return 'var(--green)';
    default: return 'var(--text-muted)';
  }
}

export function tierBgColor(tier: string): string {
  switch (tier) {
    case 'opus': return 'var(--accent-bg, rgba(139,92,246,0.12))';
    case 'sonnet': return 'var(--yellow-bg, rgba(234,179,8,0.12))';
    case 'haiku': return 'var(--green-bg, rgba(34,197,94,0.12))';
    default: return 'rgba(128,128,128,0.12)';
  }
}
