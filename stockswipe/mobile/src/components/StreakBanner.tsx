interface Props { streakDays: number }

export function StreakBanner({ streakDays }: Props) {
  if (streakDays < 1) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: '#ff690022',
      border: '1px solid #ff6900',
      borderRadius: 16,
      padding: '4px 12px',
      color: '#ff6900',
      fontSize: 12,
      fontWeight: 700,
    }}>
      🔥 {streakDays} day{streakDays > 1 ? 's' : ''} streak
    </span>
  );
}
