import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, SectorColors, Typography, Spacing } from '../constants/theme';
import { Sparkline } from './Sparkline';
import { ScoreBadge } from './ScoreBadge';
import { FactorTag } from './FactorTag';
import type { StockCard as StockCardData } from '../hooks/useFeed';

const CARD_WIDTH = 340;
const CARD_HEIGHT = 500;
const DISCLAIMER = 'Not financial advice. Paper trading only.';

interface Props {
  card: StockCardData;
}

export function StockCard({ card }: Props) {
  const sectorColor = SectorColors[card.sector] ?? SectorColors.Unknown;
  const changePositive = (card.change_pct ?? 0) >= 0;

  return (
    <View style={styles.card}>
      {/* 1. Sector color band */}
      <View style={[styles.sectorBand, { backgroundColor: sectorColor }]} />

      <View style={styles.body}>
        {/* 2. Ticker + company name */}
        <View style={styles.header}>
          <Text style={styles.ticker}>{card.ticker}</Text>
          <Text style={styles.company} numberOfLines={1}>{card.name}</Text>
          <Text style={[styles.sector, { color: sectorColor }]}>{card.sector}</Text>
        </View>

        {/* 3. Sparkline */}
        <View style={styles.sparklineContainer}>
          <Sparkline prices={card.sparkline} width={CARD_WIDTH - 48} height={90} />
        </View>

        {/* 4. Price + % change */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {card.price != null ? `$${card.price.toFixed(2)}` : '—'}
          </Text>
          {card.change_pct != null && (
            <Text style={[styles.change, { color: changePositive ? Colors.green : Colors.red }]}>
              {changePositive ? '+' : ''}{card.change_pct.toFixed(2)}%
            </Text>
          )}
        </View>

        {/* 5. Score badge */}
        <View style={styles.badgeRow}>
          <ScoreBadge score={card.composite_score} />
        </View>

        {/* 6. Factor tags */}
        <FactorTag tags={card.factor_tags} />

        {/* 7. Disclaimer */}
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sectorBand: {
    height: 5,
    width: '100%',
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    gap: 2,
  },
  ticker: {
    ...Typography.ticker,
    color: Colors.text,
  },
  company: {
    ...Typography.company,
    color: Colors.textSecondary,
  },
  sector: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sparklineContainer: {
    marginVertical: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  price: {
    ...Typography.price,
    color: Colors.text,
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    marginVertical: Spacing.xs,
  },
  disclaimer: {
    ...Typography.micro,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
