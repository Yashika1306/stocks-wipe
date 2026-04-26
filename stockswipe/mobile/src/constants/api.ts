export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000');

export const ENDPOINTS = {
  register:    '/auth/register',
  login:       '/auth/login',
  feed:        (userId: string) => `/feed/${userId}`,
  swipe:       '/swipe',
  portfolio:   (userId: string) => `/portfolio/${userId}`,
  leaderboard: '/leaderboard',
} as const;
