import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Colors } from '../constants/theme';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? ENDPOINTS.login : ENDPOINTS.register;
      const body = mode === 'login'
        ? { email, password }
        : { email, password, display_name: name };
      const { data } = await axios.post(`${API_BASE_URL}${endpoint}`, body);
      localStorage.setItem('auth_token', data.access_token);
      // decode user_id from JWT payload (base64url → base64)
      const b64 = data.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      localStorage.setItem('user_id', payload.sub);
      navigate('/swipe');
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail : 'Something went wrong';
      setError(msg ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: Colors.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 380,
        background: Colors.surface,
        borderRadius: 20,
        padding: 36,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: Colors.text }}>StockSwipe</div>
          <div style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 4 }}>
            Tinder for investing
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: `1px solid ${Colors.border}` }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1,
              padding: '9px 0',
              border: 'none',
              background: mode === m ? Colors.green : 'transparent',
              color: mode === m ? '#000' : Colors.textSecondary,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <input
              placeholder="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <div style={{ color: Colors.red, fontSize: 13, textAlign: 'center' }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '11px',
            borderRadius: 10,
            border: 'none',
            background: Colors.green,
            color: '#000',
            fontWeight: 800,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 4,
          }}>
            {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 20 }}>
          This is not investment advice. All portfolios are simulated.
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid #2e2e3e`,
  background: '#22222e',
  color: '#f0f0f5',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
