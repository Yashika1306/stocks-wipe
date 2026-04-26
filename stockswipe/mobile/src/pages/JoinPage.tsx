import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Colors } from '../constants/theme';
import { API_BASE_URL } from '../constants/api';

interface PreviewData {
  owner_name: string;
  friend_count: number;
  top_streak: number;
}

export function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!code) return;
    axios.get(`${API_BASE_URL}/friends/preview/${code}`)
      .then(r => setPreview(r.data))
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!token) {
      // Save code and redirect to login
      sessionStorage.setItem('pending_join_code', code ?? '');
      navigate('/login', { state: { from: `/join/${code}` } });
      return;
    }
    setJoining(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.post(`${API_BASE_URL}/friends/join/${code}`, {}, { headers });
      if (data.ok) {
        navigate('/friends', { replace: true });
      } else {
        setError(data.error ?? 'Could not join. Try again.');
      }
    } catch {
      setError('Something went wrong. Check your connection.');
    }
    setJoining(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: Colors.background,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: Colors.surface, borderRadius: 24,
        border: `1px solid ${Colors.border}`,
        padding: 40, textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontWeight: 900, fontSize: 22, color: Colors.text, marginBottom: 32, letterSpacing: 0.5 }}>
          StockSwipe
        </div>

        {loading ? (
          <div style={{ color: Colors.textMuted, fontSize: 14 }}>Loading invite…</div>
        ) : error ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <div style={{ color: Colors.red, fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Invalid link</div>
            <div style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 24 }}>{error}</div>
            <button
              onClick={() => navigate('/login')}
              style={btnStyle(Colors.blue)}
            >
              Go to app
            </button>
          </>
        ) : preview ? (
          <>
            {/* Invite card */}
            <div style={{
              background: `linear-gradient(135deg, #3d8ef018, #a855f712)`,
              border: `1px solid #3d8ef044`,
              borderRadius: 16, padding: 24, marginBottom: 28,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
              <div style={{ color: Colors.text, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                {preview.owner_name} invited you!
              </div>
              <div style={{ color: Colors.textSecondary, fontSize: 13 }}>
                Join their StockSwipe circle and compete on the leaderboard.
              </div>

              <div style={{
                display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center',
              }}>
                <StatChip label="Friends" value={String(preview.friend_count)} />
                <StatChip label="Top streak" value={`${preview.top_streak}d 🔥`} />
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              style={btnStyle(Colors.green, joining)}
            >
              {joining ? 'Joining…' : token ? 'Join their circle 🎉' : 'Sign in to join'}
            </button>

            <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 16 }}>
              By joining you agree to show your display name and portfolio returns to mutual friends.
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: Colors.surfaceAlt, borderRadius: 10,
      padding: '8px 16px', flex: 1,
    }}>
      <div style={{ color: Colors.text, fontWeight: 700, fontSize: 15 }}>{value}</div>
      <div style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    width: '100%', padding: '14px 0',
    borderRadius: 12, border: 'none',
    background: disabled ? Colors.surfaceAlt : color,
    color: disabled ? Colors.textMuted : (color === Colors.green ? '#000' : '#fff'),
    fontWeight: 700, fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
  };
}
