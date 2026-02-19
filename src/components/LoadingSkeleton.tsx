interface LoadingSkeletonProps {
  count?: number;
  compact?: boolean;
}

export default function LoadingSkeleton({ count = 3, compact = false }: LoadingSkeletonProps) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`card ${compact ? 'card-compact' : ''}`} style={{ cursor: 'default' }}>
          <div style={{
            height: 14, width: '60%', background: 'var(--border)', borderRadius: 6,
            marginBottom: 10, animation: 'skeletonPulse 1.5s ease-in-out infinite',
          }} />
          <div style={{
            height: 28, width: '40%', background: 'var(--border)', borderRadius: 6,
            marginBottom: 8, animation: 'skeletonPulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s',
          }} />
          <div style={{
            height: 12, width: '80%', background: 'var(--border)', borderRadius: 6,
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
            animationDelay: '0.4s',
          }} />
        </div>
      ))}
    </div>
  );
}
