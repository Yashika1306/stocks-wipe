import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export interface FriendConsensus {
  bullish: number;
  total: number;
  names: string[];
}

export interface StockCard {
  ticker: string;
  name: string;
  sector: string;
  composite_score: number;
  factor_tags: string[];
  sparkline: number[];
  price: number | null;
  change_pct: number | null;
  friend_consensus?: FriendConsensus;
}

const PREFETCH_THRESHOLD = 5;

export function useFeed(userId: string) {
  const [cards, setCards] = useState<StockCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchFeed = useCallback(async () => {
    if (!userId || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_BASE_URL}${ENDPOINTS.feed(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards(prev => {
        const seen = new Set(prev.map(c => c.ticker));
        return [...prev, ...(data.cards as StockCard[]).filter(c => !seen.has(c.ticker))];
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [userId]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const popCard = useCallback(() => {
    setCards(prev => {
      const next = prev.slice(1);
      if (next.length < PREFETCH_THRESHOLD) fetchFeed();
      return next;
    });
  }, [fetchFeed]);

  return { cards, loading, error, popCard, refetch: fetchFeed };
}
