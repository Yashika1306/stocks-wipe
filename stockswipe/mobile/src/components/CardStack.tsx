import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Colors } from '../constants/theme';
import { StockCard } from './StockCard';
import type { StockCard as CardData } from '../hooks/useFeed';
import type { SwipeDirection } from '../hooks/useSwipe';

interface Props {
  cards: CardData[];
  onSwipe: (card: CardData, direction: SwipeDirection) => void;
  premiumTags?: boolean;
  onBountyTrigger?: (card: CardData) => void; // called when right-swipe to let parent show modal
}

const SWIPE_THRESHOLD = 100;

function SwipeableCard({
  card, isTop, onSwipe, premiumTags,
}: {
  card: CardData; isTop: boolean;
  onSwipe: (dir: SwipeDirection) => void;
  premiumTags: boolean;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const origin = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.active) return;
    setDrag(d => ({ ...d, x: e.clientX - origin.current.x, y: e.clientY - origin.current.y }));
  };

  const onPointerUp = useCallback(() => {
    if (!drag.active) return;
    const { x, y } = drag;
    setDrag({ x: 0, y: 0, active: false });
    if (y < -SWIPE_THRESHOLD && Math.abs(x) < 80) { onSwipe('up');    return; }
    if (x >  SWIPE_THRESHOLD)                      { onSwipe('right'); return; }
    if (x < -SWIPE_THRESHOLD)                      { onSwipe('left');  return; }
  }, [drag, onSwipe]);

  const rotate = drag.x * 0.06;
  const stamp =
    drag.y < -SWIPE_THRESHOLD && Math.abs(drag.x) < 80 ? 'up'    :
    drag.x >  SWIPE_THRESHOLD                           ? 'right' :
    drag.x < -SWIPE_THRESHOLD                           ? 'left'  : null;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translate(${drag.x}px,${drag.y}px) rotate(${rotate}deg)`,
        transition: drag.active ? 'none' : 'transform 0.35s ease',
        cursor: isTop ? (drag.active ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
        position: 'relative',
      }}
    >
      <StockCard card={card} premiumTags={premiumTags} />
      {stamp === 'right' && <Stamp label="BULLISH"    color={Colors.green} rot={12}  align="right" />}
      {stamp === 'left'  && <Stamp label="PASS"       color={Colors.red}   rot={-12} align="left"  />}
      {stamp === 'up'    && <Stamp label="PORTFOLIO"  color={Colors.blue}  rot={-4}  align="center"/>}
    </div>
  );
}

export function CardStack({ cards, onSwipe, premiumTags = false, onBountyTrigger }: Props) {
  const handleSwipe = useCallback((card: CardData, dir: SwipeDirection) => {
    if (dir === 'right' && onBountyTrigger) {
      onBountyTrigger(card);
    } else {
      onSwipe(card, dir);
    }
  }, [onSwipe, onBountyTrigger]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!cards.length) return;
      // Don't fire when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowRight': handleSwipe(cards[0], 'right'); break;
        case 'ArrowLeft':  handleSwipe(cards[0], 'left');  break;
        case 'ArrowUp':
        case 'Enter':      onSwipe(cards[0], 'up');        break;
        case ' ':
          e.preventDefault();
          onSwipe(cards[0], 'left');                       break; // spacebar = skip/pass
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cards, handleSwipe, onSwipe]);

  const triggerButton = (dir: SwipeDirection) => {
    if (!cards.length) return;
    if (dir === 'right' && onBountyTrigger) onBountyTrigger(cards[0]);
    else onSwipe(cards[0], dir);
  };

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: Colors.textSecondary, paddingTop: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: Colors.text }}>All caught up!</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Check back tomorrow for fresh picks.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Stack */}
      <div style={{ position: 'relative', width: 340, height: 520 }}>
        {cards.slice(0, 3).map((card, i) => (
          <div key={card.ticker} style={{
            position: 'absolute',
            top: i * 12,
            left: 0, right: 0,
            zIndex: 10 - i,
            transform: `scale(${1 - i * 0.04})`,
            transformOrigin: 'top center',
          }}>
            <SwipeableCard
              card={card}
              isTop={i === 0}
              premiumTags={premiumTags}
              onSwipe={dir => handleSwipe(card, dir)}
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ActionBtn color={Colors.red}   icon="✕"  label="Pass"      kb="←"  onClick={() => triggerButton('left')}  />
        <ActionBtn color={Colors.blue}  icon="↑"  label="Portfolio" kb="↑/⏎" onClick={() => triggerButton('up')}   small />
        <ActionBtn color={Colors.green} icon="✓"  label="Bullish"   kb="→"  onClick={() => triggerButton('right')} />
      </div>

      <div style={{ color: Colors.textMuted, fontSize: 11, letterSpacing: 0.3 }}>
        ← → ↑  ·  Space = pass  ·  Enter = portfolio
      </div>
    </div>
  );
}

function Stamp({ label, color, rot, align }: {
  label: string; color: string; rot: number; align: 'left'|'right'|'center';
}) {
  const pos: React.CSSProperties =
    align === 'right'  ? { top: 40, right: 20 } :
    align === 'left'   ? { top: 40, left: 20  } :
    { top: 40, left: '50%', marginLeft: -64 };
  return (
    <div style={{
      position: 'absolute', ...pos,
      padding: '6px 14px',
      border: `3px solid ${color}`,
      background: color + '22',
      borderRadius: 8,
      color: Colors.text,
      fontSize: 17, fontWeight: 900, letterSpacing: 2,
      pointerEvents: 'none',
      transform: `rotate(${rot}deg)`,
    }}>
      {label}
    </div>
  );
}

function ActionBtn({ icon, label, kb, color, onClick, small }: {
  icon: string; label: string; kb: string; color: string; onClick: () => void; small?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const sz = small ? 52 : 64;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        title={`${label} (${kb})`}
        style={{
          width: sz, height: sz, borderRadius: '50%',
          border: `2px solid ${color}`,
          background: hov ? color + '33' : color + '18',
          color, fontSize: small ? 16 : 20,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
      >
        {icon}
      </button>
      <span style={{ color: Colors.textMuted, fontSize: 10 }}>{kb}</span>
    </div>
  );
}
