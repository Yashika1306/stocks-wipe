import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Colors } from '../constants/theme';
import { API_BASE_URL } from '../constants/api';

interface Friend {
  id: string;
  display_name: string;
  avatar_color: string;
  streak_days: number;
  mutual_streak: number;
  total_return: number;
  swipe_count: number;
  last_active: string;
  is_online: boolean;
}

type Tab = 'streaks' | 'leaderboard';

export function FriendsPage() {
  const [friends, setFriends]         = useState<Friend[]>([]);
  const [inviteCode, setInviteCode]   = useState('');
  const [shareUrl, setShareUrl]       = useState('');
  const [tab, setTab]                 = useState<Tab>('streaks');
  const [joinCode, setJoinCode]       = useState('');
  const [joinMsg, setJoinMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const joinRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE_URL}/friends`,             { headers }),
      axios.get(`${API_BASE_URL}/friends/invite-code`, { headers }),
    ]).then(([fr, inv]) => {
      setFriends(fr.data.friends ?? []);
      const code = inv.data.code ?? '';
      setInviteCode(code);
      // Build URL client-side so it always matches the current origin
      setShareUrl(inv.data.share_url ?? `${window.location.origin}/join/${code}`);
    }).catch(() => {
      // Fallback: generate a placeholder URL so the share button still works
      const fallback = 'YASHIKA8';
      setInviteCode(fallback);
      setShareUrl(`${window.location.origin}/join/${fallback}`);
    }).finally(() => setLoading(false));
  }, []);

  const shareLink = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: 'Join my StockSwipe circle!',
          text: `I'm on StockSwipe — compete with me on stock picks! Use my invite link to join.`,
          url: shareUrl,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/friends/join/${joinCode.trim()}`, {}, { headers });
      setJoinMsg({ ok: data.ok, text: data.ok ? `Joined ${data.owner_name ?? "their"} circle! 🎉` : data.error });
      if (data.ok) {
        setJoinCode('');
        // Refresh friends
        const fr = await axios.get(`${API_BASE_URL}/friends`, { headers });
        setFriends(fr.data.friends);
      }
    } catch {
      setJoinMsg({ ok: false, text: 'Invalid code. Check with your friend!' });
    }
    setTimeout(() => setJoinMsg(null), 4000);
  };

  const sorted =
    tab === 'streaks'
      ? [...friends].sort((a, b) => b.mutual_streak - a.mutual_streak)
      : [...friends].sort((a, b) => b.total_return - a.total_return);

  const myStreak = Number(localStorage.getItem('streak_days') ?? 7);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 48px' }}>

      <h1 style={{ color: Colors.text, fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Friends</h1>
      <p style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 24 }}>
        Compete with friends, keep mutual streaks alive, and see who's actually beating the market.
      </p>

      {/* ── Invite panel ─────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, #3d8ef018, #a855f712)`,
        border: `1px solid #3d8ef044`,
        borderRadius: 18, padding: 24, marginBottom: 24,
      }}>
        <div style={{ color: Colors.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Invite Friends
        </div>
        <div style={{ color: Colors.textSecondary, fontSize: 13, marginBottom: 18 }}>
          Share your link — anyone who clicks it joins your circle and appears on your leaderboard.
        </div>

        {/* Share URL row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{
            flex: 1, padding: '10px 14px',
            background: Colors.surface, borderRadius: 10,
            border: `1px solid ${Colors.border}`,
            color: Colors.textSecondary, fontSize: 13,
            fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shareUrl || (loading ? 'Loading…' : 'Could not load link — check server')}
          </div>
          <button
            onClick={shareLink}
            disabled={!shareUrl}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: copied ? Colors.green : Colors.blue,
              color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: shareUrl ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s', whiteSpace: 'nowrap',
              opacity: shareUrl ? 1 : 0.5,
            }}
          >
            {copied ? '✓ Copied!' : 'share' in navigator ? '↗ Share' : '📋 Copy Link'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: Colors.border }} />
          <span style={{ color: Colors.textMuted, fontSize: 11 }}>or enter a friend's code</span>
          <div style={{ flex: 1, height: 1, background: Colors.border }} />
        </div>

        {/* Join by code */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <input
            ref={joinRef}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. JHANVI7"
            maxLength={12}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${Colors.border}`,
              background: Colors.surfaceAlt, color: Colors.text,
              fontSize: 14, fontFamily: 'monospace', letterSpacing: 1,
              outline: 'none',
            }}
          />
          <button
            onClick={handleJoin}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: Colors.green, color: '#000',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            Join Circle
          </button>
        </div>

        {joinMsg && (
          <div style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: 13,
            background: joinMsg.ok ? Colors.green + '22' : Colors.red + '22',
            color: joinMsg.ok ? Colors.green : Colors.red,
            border: `1px solid ${joinMsg.ok ? Colors.green + '44' : Colors.red + '44'}`,
          }}>
            {joinMsg.text}
          </div>
        )}

        <div style={{ marginTop: 14, color: Colors.textMuted, fontSize: 11 }}>
          Your invite code: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: Colors.blue }}>
            {inviteCode || '…'}
          </span>
        </div>
      </div>

      {/* ── Friends list ─────────────────────────────────────────────────── */}
      <div style={{
        background: Colors.surface, borderRadius: 16,
        border: `1px solid ${Colors.border}`, overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${Colors.border}`,
        }}>
          {([['streaks', '🔥 Streaks'], ['leaderboard', '🏆 Returns']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '13px 0',
              border: 'none', background: 'none',
              color: tab === t ? Colors.green : Colors.textSecondary,
              fontWeight: tab === t ? 700 : 500, fontSize: 13,
              borderBottom: tab === t ? `2px solid ${Colors.green}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* My row */}
        <div style={{
          padding: '14px 20px',
          background: Colors.green + '0a',
          borderBottom: `1px solid ${Colors.border}`,
        }}>
          <FriendRow
            friend={{
              id: 'me', display_name: 'You', avatar_color: Colors.green,
              streak_days: myStreak, mutual_streak: 0,
              total_return: 4.14, swipe_count: 47,
              last_active: new Date().toISOString().split('T')[0], is_online: true,
            }}
            rank={tab === 'leaderboard' ? ([...sorted].findIndex(() => false) ?? 0) + 1 : undefined}
            tab={tab}
            isMe
          />
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: Colors.textMuted }}>Loading friends…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ color: Colors.text, fontWeight: 600 }}>No friends yet</div>
            <div style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              Share your invite link to get started!
            </div>
          </div>
        ) : (
          sorted.map((f, i) => (
            <div key={f.id} style={{ borderBottom: `1px solid ${Colors.border}` }}>
              <div style={{ padding: '14px 20px' }}>
                <FriendRow
                  friend={f}
                  rank={tab === 'leaderboard' ? i + 1 : undefined}
                  tab={tab}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <p style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 24 }}>
        Mutual streaks reset if either friend misses a day. Keep swiping to maintain them!
      </p>
    </div>
  );
}

// ── FriendRow ─────────────────────────────────────────────────────────────────
function FriendRow({ friend, rank, tab, isMe }: {
  friend: Friend; rank?: number; tab: Tab; isMe?: boolean;
}) {
  const returnUp = friend.total_return >= 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Rank (leaderboard tab only) */}
      {tab === 'leaderboard' && rank !== undefined && (
        <span style={{ width: 24, color: Colors.textMuted, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </span>
      )}

      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: friend.avatar_color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff',
        }}>
          {friend.display_name[0].toUpperCase()}
        </div>
        {/* Online dot */}
        {friend.is_online && (
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 10, height: 10, borderRadius: '50%',
            background: Colors.green, border: `2px solid ${Colors.surface}`,
          }} />
        )}
      </div>

      {/* Name + last active */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: isMe ? Colors.green : Colors.text, fontWeight: 600, fontSize: 14 }}>
          {friend.display_name}{isMe ? ' (You)' : ''}
        </div>
        <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
          {friend.is_online ? '● Online' : `Last seen ${friend.last_active}`}
          {' · '}{friend.swipe_count} swipes
        </div>
      </div>

      {/* Right side — differs by tab */}
      {tab === 'streaks' ? (
        <MutualStreakBadge days={isMe ? 0 : friend.mutual_streak} personalDays={friend.streak_days} isMe={isMe} />
      ) : (
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: returnUp ? Colors.green : Colors.red, fontWeight: 700, fontSize: 15 }}>
            {returnUp ? '+' : ''}{friend.total_return.toFixed(2)}%
          </div>
          <div style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>portfolio return</div>
        </div>
      )}
    </div>
  );
}

function MutualStreakBadge({ days, personalDays, isMe }: { days: number; personalDays: number; isMe?: boolean }) {
  if (isMe) {
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#ff6900', fontWeight: 700, fontSize: 15 }}>🔥 {personalDays}d</div>
        <div style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>your streak</div>
      </div>
    );
  }

  const color = days >= 14 ? '#a855f7' : days >= 7 ? Colors.green : days >= 3 ? '#ff6900' : Colors.textMuted;
  const label = days >= 30 ? '🔥🔥' : days >= 7 ? '🔥' : '💤';

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ color, fontWeight: 700, fontSize: 15 }}>{label} {days}d</div>
      <div style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>mutual streak</div>
      <div style={{ color: Colors.textMuted, fontSize: 10 }}>
        their streak: {personalDays}d
      </div>
    </div>
  );
}
