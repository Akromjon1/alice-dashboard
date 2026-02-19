import { getModelTier, tierColor, tierBgColor } from '../utils';

interface ModelBadgeProps {
  model: string;
}

export default function ModelBadge({ model }: ModelBadgeProps) {
  const tier = getModelTier(model);
  const color = tierColor(tier);
  const bg = tierBgColor(tier);

  return (
    <span className={`badge-${tier}`} style={{
      fontSize: 10, fontWeight: 600, fontFamily: 'Fira Code, monospace',
      padding: '2px 8px', borderRadius: 4,
      background: bg, color: color, border: `1px solid ${color}44`,
    }}>
      {tier}
    </span>
  );
}
