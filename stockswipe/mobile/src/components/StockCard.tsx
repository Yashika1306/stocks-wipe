import { Colors, SectorColors } from '../constants/theme';
import { Sparkline } from './Sparkline';
import { ScoreBadge } from './ScoreBadge';
import { FactorTag } from './FactorTag';
import type { StockCard as CardData } from '../hooks/useFeed';

interface Props {
  card: CardData;
  premiumTags?: boolean; // unlocked at 30-day streak
}

export function StockCard({ card, premiumTags = false }: Props) {
  const sectorColor  = SectorColors[card.sector] ?? SectorColors['Unknown'];
  const changeUp     = (card.change_pct ?? 0) >= 0;
  const consensus    = card.friend_consensus;
  const bullishPct   = consensus && consensus.total > 0
    ? Math.round((consensus.bullish / consensus.total) * 100) : null;

  return (
    <div style={{
      width: 340,
      background: Colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      userSelect: 'none',
      cursor: 'grab',
    }}>
      {/* Sector band */}
      <div style={{ height: 5, background: sectorColor }} />

      <div style={{ padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: Colors.text, letterSpacing: 1 }}>
              {card.ticker}
            </div>
            <div style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 1 }}>{card.name}</div>
            <div style={{ color: sectorColor, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
              {card.sector}
            </div>
          </div>
          <ScoreBadge score={card.composite_score} />
        </div>

        {/* Friend consensus */}
        {consensus && consensus.total > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: Colors.surfaceAlt,
            borderRadius: 10,
            padding: '6px 10px',
            border: `1px solid ${Colors.border}`,
          }}>
            <span style={{ fontSize: 14 }}>👥</span>
            <span style={{ fontSize: 12, color: Colors.textSecondary, flex: 1 }}>
              <span style={{ color: consensus.bullish > consensus.total / 2 ? Colors.green : Colors.amber, fontWeight: 700 }}>
                {consensus.bullish} of {consensus.total}
              </span>
              {' '}friend{consensus.total !== 1 ? 's' : ''} bullish
              {consensus.names.length > 0 && (
                <span style={{ color: Colors.textMuted }}> · {consensus.names.join(', ')}</span>
              )}
            </span>
            {bullishPct !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 4, borderRadius: 2,
                  background: Colors.border, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${bullishPct}%`, height: '100%',
                    background: bullishPct >= 50 ? Colors.green : Colors.red,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 9, color: Colors.textMuted, marginTop: 2 }}>{bullishPct}%</span>
              </div>
            )}
          </div>
        )}

        {/* Sparkline */}
        <Sparkline prices={card.sparkline} height={76} />

        {/* Price + change */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: Colors.text }}>
            {card.price != null ? `$${card.price.toFixed(2)}` : '—'}
          </span>
          {card.change_pct != null && (
            <span style={{ fontSize: 14, fontWeight: 600, color: changeUp ? Colors.green : Colors.red }}>
              {changeUp ? '+' : ''}{card.change_pct.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Factor tags */}
        <FactorTag tags={card.factor_tags} premium={premiumTags} />

        {/* Disclaimer */}
        <div style={{ color: Colors.textMuted, fontSize: 9, textAlign: 'center' }}>
          Not financial advice · Paper trading only
        </div>
      </div>
    </div>
  );
}
