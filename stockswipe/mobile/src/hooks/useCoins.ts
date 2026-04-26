import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

export interface Bounty {
  id: string;
  ticker: string;
  bet_coins: number;
  direction: 'right' | 'left';
  entry_price: number;
  bet_date: string;
  settled: boolean;
  won?: boolean;
  coins_won?: number;
  current_return?: number;
}

export function useCoins() {
  const [balance, setBalance] = useState<number>(() => {
    return Number(localStorage.getItem('coins_balance') ?? 340);
  });
  const [bounties, setBounties] = useState<Bounty[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API_BASE_URL}/coins`,    { headers }).then(r => { setBalance(r.data.balance); localStorage.setItem('coins_balance', String(r.data.balance)); }).catch(() => {});
    axios.get(`${API_BASE_URL}/bounties`, { headers }).then(r => setBounties(r.data.bounties)).catch(() => {});
  }, []);

  const placeBounty = useCallback(async (ticker: string, coins: number) => {
    if (coins > balance) return false;
    const token = localStorage.getItem('auth_token');
    try {
      await axios.post(`${API_BASE_URL}/bounties`, { ticker, coins, direction: 'right' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = balance - coins;
      setBalance(next);
      localStorage.setItem('coins_balance', String(next));
      return true;
    } catch { return false; }
  }, [balance]);

  const addCoins = useCallback((amount: number) => {
    setBalance(prev => {
      const next = prev + amount;
      localStorage.setItem('coins_balance', String(next));
      return next;
    });
  }, []);

  return { balance, bounties, placeBounty, addCoins };
}
