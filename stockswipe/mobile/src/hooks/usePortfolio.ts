import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export interface Position {
  ticker: string;
  entry_price: number;
  current_price: number;
  return_pct: number;
  entry_date: string;
}

export interface Portfolio {
  positions: Position[];
  total_return: number;
  hit_rate: number;
  best_call: Position | null;
  worst_call: Position | null;
}

export function usePortfolio(userId: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_BASE_URL}${ENDPOINTS.portfolio(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPortfolio(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPortfolio();
    const id = setInterval(fetchPortfolio, 60_000);
    return () => clearInterval(id);
  }, [fetchPortfolio]);

  return { portfolio, loading, error, refetch: fetchPortfolio };
}
