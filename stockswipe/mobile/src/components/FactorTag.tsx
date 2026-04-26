import { Colors } from '../constants/theme';

interface Props { tags: string[]; premium?: boolean }

const PREMIUM_COLORS: Record<string, string> = {
  'Strong momentum':      '#00d084',
  'Weak momentum':        '#ff4757',
  'Cheap vs peers':       '#3d8ef0',
  'Expensive vs peers':   '#ffa502',
  'Positive buzz':        '#00d084',
  'Negative sentiment':   '#ff4757',
  'AI tailwind':          '#a855f7',
  'AI chips':             '#a855f7',
  'Cloud growth':         '#3d8ef0',
  'High yield':           '#f39c12',
  'Strong dividend':      '#f39c12',
};

export function FactorTag({ tags, premium = false }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {tags.slice(0, 3).map((tag, i) => {
        const accent = premium ? (PREMIUM_COLORS[tag] ?? Colors.textSecondary) : Colors.textSecondary;
        return (
          <span key={i} style={{
            background: premium ? accent + '18' : Colors.surfaceAlt,
            border: `1px solid ${premium ? accent + '55' : Colors.border}`,
            borderRadius: 12,
            padding: '3px 10px',
            color: accent,
            fontSize: 11,
            fontWeight: premium ? 600 : 500,
          }}>
            {premium && '✦ '}{tag}
          </span>
        );
      })}
    </div>
  );
}
