import { useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export type SwipeDirection = 'right' | 'left' | 'up';

interface SwipePayload {
  userId: string;
  ticker: string;
  direction: SwipeDirection;
  cardScore: number;
  cardShownAt: number;
}

export function useSwipe() {
  const emitSwipe = useCallback((payload: SwipePayload) => {
    const hesitation_ms = Date.now() - payload.cardShownAt;
    const token = localStorage.getItem('auth_token');
    // fire-and-forget
    axios.post(
      `${API_BASE_URL}${ENDPOINTS.swipe}`,
      {
        user_id: payload.userId,
        ticker: payload.ticker,
        direction: payload.direction,
        hesitation_ms,
        card_score: payload.cardScore,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => {});
  }, []);

  return { emitSwipe };
}
