import { NavLink } from 'react-router-dom';
import { Colors } from '../constants/theme';
import type { StreakTier } from '../hooks/useStreakRewards';

const LINKS = [
  { to: '/dashboard', label: '⚡ Dashboard' },
  { to: '/swipe',     label: '🃏 Swipe' },
  { to: '/portfolio', label: '💼 Portfolio' },
  { to: '/friends',   label: '👥 Friends' },
];

interface Props {
  streak: number;
  tier: StreakTier;
  coins: number;
}

export function Navbar({ streak, tier, coins }: Props) {
  const accentColor = tier.accent;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 56,
      background: Colors.surface,
      borderBottom: `1px solid ${Colors.border}`,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 100,
    }}>
      {/* Logo */}
      <span style={{ fontWeight: 900, fontSize: 17, color: Colors.text, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
        StockSwipe
      </span>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2 }}>
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? accentColor : Colors.textSecondary,
              background: isActive ? accentColor + '18' : 'transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right chips */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Coins */}
        <span style={{
          background: Colors.amber + '18', border: `1px solid ${Colors.amber}44`,
          borderRadius: 12, padding: '3px 10px',
          color: Colors.amber, fontSize: 12, fontWeight: 700,
        }}>
          {coins} 🪙
        </span>

        {/* Streak + tier */}
        {streak > 0 && (
          <span style={{
            background: accentColor + '18', border: `1px solid ${accentColor}44`,
            borderRadius: 12, padding: '3px 10px',
            color: accentColor, fontSize: 12, fontWeight: 700,
            ...(tier.level >= 3 && { boxShadow: `0 0 8px ${accentColor}66` }),
          }}>
            🔥 {streak}{tier.level > 0 ? ` · ${tier.label}` : ''}
          </span>
        )}

        {/* Legend crown */}
        {tier.exclusiveBadge && (
          <span title="Legend — 100-day streak" style={{ fontSize: 18 }}>👑</span>
        )}
      </div>
    </nav>
  );
}
