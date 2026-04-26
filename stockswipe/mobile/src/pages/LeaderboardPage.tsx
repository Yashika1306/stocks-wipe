import { useEffect, useState } from 'react';
import axios from 'axios';
import { Colors } from '../constants/theme';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

interface Entry {
  rank: number;
  display_name: string;
  total_return: number;
  swipe_count: number;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [weekReset, setWeekReset] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    axios.get(`${API_BASE_URL}${ENDPOINTS.leaderboard}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      setEntries(data.entries);
      setYourRank(data.your_rank);
      setWeekReset(data.week_reset);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <h1 style={{ color: Colors.text, fontSize: 22, fontWeight: 800, margin: 0 }}>Leaderboard</h1>
        {weekReset && (
          <span style={{ color: Colors.textMuted, fontSize: 12 }}>Resets {weekReset}</span>
        )}
      </div>

      {yourRank && (
        <div style={{
          background: Colors.blue + '18',
          border: `1px solid ${Colors.blue}`,
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          textAlign: 'center',
          color: Colors.blue,
          fontWeight: 700,
          fontSize: 14,
        }}>
          Your rank: #{yourRank}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40, color: Colors.textSecondary }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 40, color: Colors.textSecondary, fontSize: 14 }}>
          No rankings yet — start swiping!
        </div>
      ) : (
        entries.map(entry => (
          <div key={entry.rank} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 0',
            borderBottom: `1px solid ${Colors.border}`,
            background: entry.rank === yourRank ? Colors.surface : 'transparent',
            borderRadius: entry.rank === yourRank ? 8 : 0,
            paddingLeft: entry.rank === yourRank ? 10 : 0,
          }}>
            <span style={{ fontSize: 22, width: 36, textAlign: 'center' }}>
              {MEDALS[entry.rank] ?? `#${entry.rank}`}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: Colors.text, fontWeight: 600, fontSize: 14 }}>
                {entry.display_name}{entry.rank === yourRank ? ' (You)' : ''}
              </div>
              <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                {entry.swipe_count} swipes
              </div>
            </div>
            <span style={{
              color: entry.total_return >= 0 ? Colors.green : Colors.red,
              fontWeight: 700,
              fontSize: 15,
            }}>
              {entry.total_return >= 0 ? '+' : ''}{entry.total_return.toFixed(2)}%
            </span>
          </div>
        ))
      )}
    </div>
  );
}
