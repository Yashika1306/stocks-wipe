import { useMemo } from 'react';

export interface StreakTier {
  level: 0 | 1 | 2 | 3;
  label: string;
  accent: string;        // CSS color for active theme accent
  premiumTags: boolean;
  exclusiveBadge: boolean;
  next: { days: number; label: string } | null;
}

export function useStreakRewards(streakDays: number): StreakTier {
  return useMemo(() => {
    if (streakDays >= 100) return {
      level: 3,
      label: '🏆 Legend',
      accent: '#c084fc',   // purple
      premiumTags: true,
      exclusiveBadge: true,
      next: null,
    };
    if (streakDays >= 30) return {
      level: 2,
      label: '⭐ Gold',
      accent: '#ffd700',
      premiumTags: true,
      exclusiveBadge: false,
      next: { days: 100 - streakDays, label: '🏆 Legend + exclusive badge' },
    };
    if (streakDays >= 7) return {
      level: 1,
      label: '🔥 Neon',
      accent: '#00d9ff',
      premiumTags: false,
      exclusiveBadge: false,
      next: { days: 30 - streakDays, label: '⭐ Gold + premium tags' },
    };
    return {
      level: 0,
      label: '',
      accent: '#00d084',   // default green
      premiumTags: false,
      exclusiveBadge: false,
      next: { days: 7 - streakDays, label: '🔥 Neon theme' },
    };
  }, [streakDays]);
}

export const STREAK_MILESTONES = [
  { days: 7,   label: 'Neon Theme',          icon: '🔥', desc: 'Unlocks cyan neon accent color' },
  { days: 30,  label: 'Premium Factor Tags',  icon: '⭐', desc: 'Color-coded AI confidence tags' },
  { days: 100, label: 'Legend Badge',         icon: '🏆', desc: 'Exclusive leaderboard crown badge' },
];
