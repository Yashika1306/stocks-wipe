export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.stockswipe.app';

export const ENDPOINTS = {
  register:    '/auth/register',
  login:       '/auth/login',
  feed:        (userId: string) => `/feed/${userId}`,
  swipe:       '/swipe',
  portfolio:   (userId: string) => `/portfolio/${userId}`,
  leaderboard: '/leaderboard',
} as const;
