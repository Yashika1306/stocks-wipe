import { useCallback, useRef, useState } from 'react';
import { Colors } from '../constants/theme';
import { useFeed, StockCard } from '../hooks/useFeed';
import { useSwipe, SwipeDirection } from '../hooks/useSwipe';
import { useCoins } from '../hooks/useCoins';
import { useMissions } from '../hooks/useMissions';
import { useStreakRewards } from '../hooks/useStreakRewards';
import { CardStack } from '../components/CardStack';
import { BountyModal } from '../components/BountyModal';

export function SwipePage() {
  const userId   = localStorage.getItem('user_id') ?? '';
  const streak   = Number(localStorage.getItem('streak_days') ?? 7);
  const tier     = useStreakRewards(streak);

  const { cards, loading, error, popCard } = useFeed(userId);
  const { emitSwipe }   = useSwipe();
  const { balance, placeBounty } = useCoins();
  const { recordSwipe } = useMissions();

  const cardShownAt = useRef(Date.now());
  const [bountyCard, setBountyCard] = useState<StockCard | null>(null);

  const handleSwipe = useCallback((card: StockCard, dir: SwipeDirection) => {
    emitSwipe({ userId, ticker: card.ticker, direction: dir, cardScore: card.composite_score, cardShownAt: cardShownAt.current });
    recordSwipe(card.sector);
    popCard();
    cardShownAt.current = Date.now();
  }, [userId, emitSwipe, recordSwipe, popCard]);

  const handleBountyConfirm = useCallback(async (coins: number) => {
    if (!bountyCard) return;
    await placeBounty(bountyCard.ticker, coins);
    handleSwipe(bountyCard, 'right');
    setBountyCard(null);
  }, [bountyCard, placeBounty, handleSwipe]);

  if (loading && cards.length === 0) return <Centered><Spinner color={tier.accent} /></Centered>;
  if (error) return <Centered><span style={{ color: Colors.red }}>{error}</span></Centered>;

  return (
    <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', paddingTop: 24, paddingInline: 24 }}>

      {/* Card stack — center */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {tier.level > 0 && (
          <div style={{
            marginBottom: 12, padding: '5px 14px',
            background: tier.accent + '18', border: `1px solid ${tier.accent}44`,
            borderRadius: 20, color: tier.accent, fontSize: 12, fontWeight: 600,
          }}>
            {tier.label} — {streak}d streak
          </div>
        )}
        <CardStack
          cards={cards}
          onSwipe={handleSwipe}
          premiumTags={tier.premiumTags}
          onBountyTrigger={setBountyCard}
        />
      </div>

      {/* Right sidebar — coin balance + active bounties */}
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        <div style={{
          background: Colors.surface, borderRadius: 14,
          padding: '16px', border: `1px solid ${Colors.border}`,
        }}>
          <div style={{ color: Colors.textSecondary, fontSize: 11, fontWeight: 600 }}>COIN BALANCE</div>
          <div style={{ color: Colors.amber, fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {balance} 🪙
          </div>
          <div style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }}>
            Swipe right → bet coins on your pick
          </div>
        </div>

        <div style={{
          background: Colors.surface, borderRadius: 14,
          padding: '16px', border: `1px solid ${Colors.border}`,
        }}>
          <div style={{ color: Colors.textSecondary, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>KEYBOARD SHORTCUTS</div>
          {[
            ['←', 'Pass'],
            ['→', 'Bullish'],
            ['↑ / Enter', 'Portfolio'],
            ['Space', 'Skip'],
          ].map(([key, action]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <kbd style={{
                background: Colors.surfaceAlt, border: `1px solid ${Colors.border}`,
                borderRadius: 5, padding: '2px 7px',
                color: Colors.text, fontSize: 11, fontWeight: 600,
              }}>{key}</kbd>
              <span style={{ color: Colors.textSecondary, fontSize: 12 }}>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {bountyCard && (
        <BountyModal
          ticker={bountyCard.ticker}
          coinBalance={balance}
          onConfirm={handleBountyConfirm}
          onSkip={() => { handleSwipe(bountyCard, 'right'); setBountyCard(null); }}
        />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>{children}</div>;
}
function Spinner({ color }: { color: string }) {
  return <div style={{ width: 36, height: 36, border: `3px solid ${Colors.border}`, borderTop: `3px solid ${color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
