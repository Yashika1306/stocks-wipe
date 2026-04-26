import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../constants/theme';
import { CardStack } from '../components/CardStack';
import { BountyModal } from '../components/BountyModal';
import { useFeed, StockCard } from '../hooks/useFeed';
import { useSwipe, SwipeDirection } from '../hooks/useSwipe';
import { usePortfolio } from '../hooks/usePortfolio';
import { useCoins } from '../hooks/useCoins';
import { useMissions } from '../hooks/useMissions';
import { useStreakRewards, STREAK_MILESTONES } from '../hooks/useStreakRewards';

const DISCLAIMER = 'Not financial advice. All portfolios are simulated.';

export function DashboardPage() {
  const userId   = localStorage.getItem('user_id') ?? '';
  const streak   = Number(localStorage.getItem('streak_days') ?? 7);
  const tier     = useStreakRewards(streak);
  const nav      = useNavigate();

  const { cards, loading, popCard } = useFeed(userId);
  const { emitSwipe }               = useSwipe();
  const { portfolio }               = usePortfolio(userId);
  const { balance, bounties, placeBounty } = useCoins();
  const { missions, recordSwipe }   = useMissions();

  const cardShownAt = useRef(Date.now());
  const [bountyCard, setBountyCard] = useState<StockCard | null>(null);

  const handleSwipe = useCallback((card: StockCard, dir: SwipeDirection) => {
    emitSwipe({ userId, ticker: card.ticker, direction: dir, cardScore: card.composite_score, cardShownAt: cardShownAt.current });
    recordSwipe(card.sector);
    popCard();
    cardShownAt.current = Date.now();
  }, [userId, emitSwipe, recordSwipe, popCard]);

  const handleBountyTrigger = useCallback((card: StockCard) => setBountyCard(card), []);
  const handleBountyConfirm = useCallback(async (coins: number) => {
    if (!bountyCard) return;
    await placeBounty(bountyCard.ticker, coins);
    handleSwipe(bountyCard, 'right');
    setBountyCard(null);
  }, [bountyCard, placeBounty, handleSwipe]);
  const handleBountySkip = useCallback(() => {
    if (bountyCard) { handleSwipe(bountyCard, 'right'); }
    setBountyCard(null);
  }, [bountyCard, handleSwipe]);

  const accentColor = tier.accent;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>

      {/* ── Streak tier banner ───────────────────────────────────────────── */}
      {tier.level > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          border: `1px solid ${accentColor}44`,
          borderRadius: 12,
          padding: '10px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>
            {tier.label} Unlocked — {streak}-day streak!
          </span>
          {tier.next && (
            <span style={{ color: Colors.textMuted, fontSize: 12 }}>
              {tier.next.days} more days → {tier.next.label}
            </span>
          )}
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Portfolio Return"
          value={`${(portfolio?.total_return ?? 0) >= 0 ? '+' : ''}${portfolio?.total_return?.toFixed(2) ?? '—'}%`}
          color={(portfolio?.total_return ?? 0) >= 0 ? Colors.green : Colors.red}
          sub="vs SPY"
        />
        <StatCard
          label="Hit Rate"
          value={`${((portfolio?.hit_rate ?? 0) * 100).toFixed(0)}%`}
          color={Colors.blue}
          sub={`${portfolio?.positions?.length ?? 0} positions`}
        />
        <StatCard
          label="🪙 Coins"
          value={String(balance)}
          color={Colors.amber}
          sub={`${bounties.filter(b => !b.settled).length} active bets`}
          onClick={() => nav('/portfolio')}
        />
        <StatCard
          label="🔥 Streak"
          value={`${streak}d`}
          color={accentColor}
          sub={tier.label || (tier.next ? `${tier.next.days}d to ${tier.next.label}` : '')}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Weekly Missions */}
          <Panel title="Weekly Missions" action={{ label: 'All Missions', onClick: () => {} }}>
            {missions.length === 0 ? (
              <div style={{ color: Colors.textMuted, fontSize: 13, padding: '12px 0' }}>Loading missions…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {missions.map(m => (
                  <MissionRow key={m.id} mission={m} accentColor={accentColor} />
                ))}
              </div>
            )}
          </Panel>

          {/* Active Bounties */}
          <Panel title="Active Prediction Bounties">
            {bounties.filter(b => !b.settled).length === 0 ? (
              <div style={{ color: Colors.textMuted, fontSize: 13, padding: '8px 0' }}>
                No active bets — swipe right on a stock and place a bounty!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bounties.filter(b => !b.settled).map(b => (
                  <BountyRow key={b.id} bounty={b} />
                ))}
              </div>
            )}
          </Panel>

          {/* Streak milestones */}
          <Panel title="Streak Rewards">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STREAK_MILESTONES.map(m => {
                const unlocked = streak >= m.days;
                return (
                  <div key={m.days} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 14px',
                    background: unlocked ? accentColor + '12' : Colors.surfaceAlt,
                    borderRadius: 10,
                    border: `1px solid ${unlocked ? accentColor + '44' : Colors.border}`,
                    opacity: unlocked ? 1 : 0.6,
                  }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: unlocked ? accentColor : Colors.text, fontWeight: 600, fontSize: 13 }}>
                        {m.label}
                      </div>
                      <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>{m.desc}</div>
                    </div>
                    <span style={{ color: Colors.textMuted, fontSize: 11 }}>{m.days}d</span>
                    {unlocked && <span style={{ color: accentColor, fontSize: 14 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right column — card swipe */}
        <div style={{ position: 'sticky', top: 80 }}>
          <Panel title="Quick Swipe" action={{ label: 'Full View →', onClick: () => nav('/swipe') }}>
            {loading && cards.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spinner color={accentColor} />
              </div>
            ) : (
              <CardStack
                cards={cards}
                onSwipe={handleSwipe}
                premiumTags={tier.premiumTags}
                onBountyTrigger={handleBountyTrigger}
              />
            )}
          </Panel>
        </div>
      </div>

      <div style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 32 }}>
        {DISCLAIMER}
      </div>

      {bountyCard && (
        <BountyModal
          ticker={bountyCard.ticker}
          coinBalance={balance}
          onConfirm={handleBountyConfirm}
          onSkip={handleBountySkip}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Panel({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      background: Colors.surface,
      borderRadius: 16,
      padding: '18px 20px',
      border: `1px solid ${Colors.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: Colors.text, fontWeight: 700, fontSize: 15 }}>{title}</span>
        {action && (
          <button onClick={action.onClick} style={{
            background: 'none', border: 'none',
            color: Colors.textSecondary, fontSize: 12,
            cursor: 'pointer', fontWeight: 500,
          }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, color, sub, onClick }: {
  label: string; value: string; color: string; sub?: string; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && onClick ? Colors.surfaceAlt : Colors.surface,
        borderRadius: 14, padding: '18px 20px',
        border: `1px solid ${Colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ color: Colors.textSecondary, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MissionRow({ mission, accentColor }: { mission: ReturnType<typeof useMissions>['missions'][0]; accentColor: string }) {
  const pct = Math.min((mission.progress / mission.target) * 100, 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: mission.completed ? Colors.green : Colors.text, fontWeight: 600, fontSize: 13 }}>
          {mission.completed ? '✓ ' : ''}{mission.title}
        </span>
        <span style={{ color: Colors.amber, fontSize: 12, fontWeight: 700 }}>+{mission.reward} 🪙</span>
      </div>
      <div style={{ color: Colors.textMuted, fontSize: 11 }}>{mission.desc}</div>
      <div style={{ background: Colors.border, borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: mission.completed ? Colors.green : accentColor,
          transition: 'width 0.4s ease',
          borderRadius: 4,
        }} />
      </div>
      <div style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'right' }}>
        {mission.progress}/{mission.target} · Ends {mission.deadline}
      </div>
    </div>
  );
}

function BountyRow({ bounty }: { bounty: ReturnType<typeof useCoins>['bounties'][0] }) {
  const up = (bounty.current_return ?? 0) > 0;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: Colors.surfaceAlt, borderRadius: 10, padding: '10px 14px',
    }}>
      <div>
        <span style={{ color: Colors.text, fontWeight: 700, fontSize: 14 }}>{bounty.ticker}</span>
        <span style={{ color: Colors.textMuted, fontSize: 11, marginLeft: 8 }}>
          Bet: {bounty.bet_coins} 🪙
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: up ? Colors.green : Colors.red, fontSize: 13, fontWeight: 600 }}>
          {up ? '+' : ''}{bounty.current_return?.toFixed(1)}%
        </div>
        <div style={{ color: Colors.textMuted, fontSize: 10 }}>vs SPY</div>
      </div>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div style={{
      width: 32, height: 32,
      border: `3px solid ${Colors.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
