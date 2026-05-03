import { NavLink } from 'react-router-dom';
import { Colors } from '../constants/theme';
import type { StreakTier } from '../hooks/useStreakRewards';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { to: '/swipe',     label: 'Swipe',     icon: '🃏' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/friends',   label: 'Friends',   icon: '👥' },
];

interface Props {
  streak: number;
  tier: StreakTier;
  coins: number;
}

export function Navbar({ streak, tier, coins }: Props) {
  const accentColor = tier.accent;

  return (
    <>
      {/* ── Desktop top nav ───────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 56,
        background: Colors.surface,
        borderBottom: `1px solid ${Colors.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
      }}
        className="desktop-nav"
      >
        <span style={{ fontWeight: 900, fontSize: 17, color: Colors.text, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
          StockSwipe
        </span>

        <div style={{ display: 'flex', gap: 2 }}>
          {LINKS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? accentColor : Colors.textSecondary,
              background: isActive ? accentColor + '18' : 'transparent',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            })}>
              {icon} {label}
            </NavLink>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: Colors.amber + '18', border: `1px solid ${Colors.amber}44`,
            borderRadius: 12, padding: '3px 10px',
            color: Colors.amber, fontSize: 12, fontWeight: 700,
          }}>
            {coins} 🪙
          </span>
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
          {tier.exclusiveBadge && <span style={{ fontSize: 18 }}>👑</span>}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64,
        background: Colors.surface,
        borderTop: `1px solid ${Colors.border}`,
        display: 'flex', alignItems: 'center',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
        className="mobile-nav"
      >
        {LINKS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            textDecoration: 'none', padding: '8px 0',
            color: isActive ? accentColor : Colors.textMuted,
            transition: 'color 0.15s',
          })}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width: 600px) { .mobile-nav { display: none !important; } }
        @media (max-width: 599px) { .desktop-nav { display: none !important; } }
        @media (max-width: 599px) { main { padding-top: 0 !important; padding-bottom: 72px !important; } }
      `}</style>
    </>
  );
}
