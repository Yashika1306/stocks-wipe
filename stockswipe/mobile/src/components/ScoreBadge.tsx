import { Colors } from '../constants/theme';

interface Props { score: number }

function badgeColor(score: number) {
  if (score >= 70) return Colors.green;
  if (score >= 40) return Colors.amber;
  return Colors.red;
}

export function ScoreBadge({ score }: Props) {
  const color = badgeColor(score);
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 20,
      border: `1.5px solid ${color}`,
      background: color + '22',
      color,
      fontSize: 14,
      fontWeight: 700,
    }}>
      {Math.round(score)}
    </span>
  );
}
