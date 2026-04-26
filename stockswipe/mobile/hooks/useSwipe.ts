import { useCallback, useRef } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export type SwipeDirection = 'right' | 'left' | 'up';

interface SwipePayload {
  userId: string;
  ticker: string;
  direction: SwipeDirection;
  cardScore: number;
  cardShownAt: number; // timestamp ms
}

export function useSwipe() {
  const emitSwipe = useCallback(async (payload: SwipePayload) => {
    const hesitation_ms = Date.now() - payload.cardShownAt;

    // Haptic feedback
    if (payload.direction === 'right') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (payload.direction === 'up') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Fire-and-forget — don't await to keep UI snappy
    AsyncStorage.getItem('auth_token').then(token => {
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
      ).catch(() => {
        // silently retry in background
      });
    });
  }, []);

  return { emitSwipe };
}
