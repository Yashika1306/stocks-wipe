import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export interface StockCard {
  ticker: string;
  name: string;
  sector: string;
  composite_score: number;
  factor_tags: string[];
  sparkline: number[];
  price: number | null;
  change_pct: number | null;
}

const PREFETCH_THRESHOLD = 5; // fetch more when <5 cards left

export function useFeed(userId: string) {
  const [cards, setCards] = useState<StockCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchFeed = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_BASE_URL}${ENDPOINTS.feed(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards(prev => {
        const existingTickers = new Set(prev.map(c => c.ticker));
        const newCards = (data.cards as StockCard[]).filter(c => !existingTickers.has(c.ticker));
        return [...prev, ...newCards];
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load feed');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [userId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const popCard = useCallback(() => {
    setCards(prev => {
      const next = prev.slice(1);
      if (next.length < PREFETCH_THRESHOLD) fetchFeed();
      return next;
    });
  }, [fetchFeed]);

  return { cards, loading, error, popCard, refetch: fetchFeed };
}
