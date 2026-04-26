import { useState } from 'react';
import { Colors } from '../constants/theme';

interface Props {
  ticker: string;
  coinBalance: number;
  onConfirm: (coins: number) => void;
  onSkip: () => void;
}

const BETS = [10, 25, 50, 100];

export function BountyModal({ ticker, coinBalance, onConfirm, onSkip }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: Colors.surface,
        borderRadius: 20,
        padding: 32,
        width: 340,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        border: `1px solid ${Colors.border}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div style={{ color: Colors.text, fontSize: 18, fontWeight: 800, marginTop: 8 }}>
            Prediction Bounty
          </div>
          <div style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 6 }}>
            You're bullish on <span style={{ color: Colors.green, fontWeight: 700 }}>{ticker}</span>.
            Bet coins — if it beats SPY in 30 days, you win 2×.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {BETS.map(b => (
            <button
              key={b}
              disabled={b > coinBalance}
              onClick={() => setSelected(b)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: `2px solid ${selected === b ? Colors.green : Colors.border}`,
                background: selected === b ? Colors.green + '22' : Colors.surfaceAlt,
                color: b > coinBalance ? Colors.textMuted : (selected === b ? Colors.green : Colors.text),
                fontWeight: 700, fontSize: 14,
                cursor: b > coinBalance ? 'not-allowed' : 'pointer',
              }}
            >
              {b}
            </button>
          ))}
        </div>

        <div style={{ color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 18 }}>
          Balance: <span style={{ color: Colors.amber }}>{coinBalance} 🪙</span>
          {selected && ` · Win: ${selected * 2} coins`}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSkip} style={{
            flex: 1, padding: 11, borderRadius: 10,
            border: `1px solid ${Colors.border}`,
            background: 'transparent', color: Colors.textSecondary,
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}>
            Skip Bet
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={{
              flex: 2, padding: 11, borderRadius: 10,
              border: 'none',
              background: selected ? Colors.green : Colors.border,
              color: selected ? '#000' : Colors.textMuted,
              cursor: selected ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 14,
            }}
          >
            Bet {selected ?? '—'} Coins 🪙
          </button>
        </div>
      </div>
    </div>
  );
}
