import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const POLL_INTERVAL_MS = 60_000; // refresh every 60s

export function usePortfolio(userId: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_BASE_URL}${ENDPOINTS.portfolio(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPortfolio(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetch]);

  return { portfolio, loading, error, refetch: fetch };
}
