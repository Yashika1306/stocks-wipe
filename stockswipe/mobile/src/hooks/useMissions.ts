import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

export interface Mission {
  id: string;
  title: string;
  desc: string;
  sector: string | null;
  target: number;
  progress: number;
  reward: number;
  deadline: string;
  completed: boolean;
}

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    axios.get(`${API_BASE_URL}/missions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setMissions(r.data.missions)).catch(() => {});
  }, []);

  // Called after each swipe to update local progress
  const recordSwipe = useCallback((sector: string) => {
    setMissions(prev => prev.map(m => {
      if (m.completed) return m;
      const isMatch =
        (m.sector && m.sector === sector) ||
        (m.id === 'add_portfolio_3') ||
        (m.id === 'sectors_5');
      if (!isMatch) return m;
      const next = Math.min(m.progress + 1, m.target);
      return { ...m, progress: next, completed: next >= m.target };
    }));
  }, []);

  const totalRewardAvailable = missions.filter(m => !m.completed).reduce((s, m) => s + m.reward, 0);

  return { missions, recordSwipe, totalRewardAvailable };
}
