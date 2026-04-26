import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePortfolio, Position } from '../../hooks/usePortfolio';
import { Colors, Spacing } from '../../constants/theme';

const DISCLAIMER = 'This is not investment advice. All portfolios are simulated. Past performance does not guarantee future results.';

function PositionRow({ pos }: { pos: Position }) {
  const positive = pos.return_pct >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowTicker}>{pos.ticker}</Text>
        <Text style={styles.rowDate}>Since {pos.entry_date}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPrice}>${pos.current_price.toFixed(2)}</Text>
        <Text style={[styles.rowReturn, { color: positive ? Colors.green : Colors.red }]}>
          {positive ? '+' : ''}{pos.return_pct.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

export default function PortfolioScreen() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(setUserId);
  }, []);

  const { portfolio, loading, error } = usePortfolio(userId ?? '');

  if (!userId || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.red }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Portfolio</Text>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total Return</Text>
          <Text style={[
            styles.statValue,
            { color: (portfolio?.total_return ?? 0) >= 0 ? Colors.green : Colors.red },
          ]}>
            {(portfolio?.total_return ?? 0) >= 0 ? '+' : ''}{portfolio?.total_return.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Hit Rate</Text>
          <Text style={styles.statValue}>{((portfolio?.hit_rate ?? 0) * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Positions</Text>
          <Text style={styles.statValue}>{portfolio?.positions.length ?? 0}</Text>
        </View>
      </View>

      {/* Best/Worst */}
      {portfolio?.best_call && (
        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>🏆 Best Call</Text>
          <Text style={[styles.highlightValue, { color: Colors.green }]}>
            {portfolio.best_call.ticker} +{portfolio.best_call.return_pct.toFixed(2)}%
          </Text>
        </View>
      )}

      {/* Positions list */}
      <FlatList
        data={portfolio?.positions ?? []}
        keyExtractor={p => p.ticker}
        renderItem={({ item }) => <PositionRow pos={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Swipe up on a card to add it to your portfolio!</Text>
        }
      />

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stat: { alignItems: 'center' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  highlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  highlightLabel: { color: Colors.textSecondary, fontSize: 13 },
  highlightValue: { fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowTicker: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  rowDate: { color: Colors.textMuted, fontSize: 11 },
  rowPrice: { color: Colors.text, fontSize: 15 },
  rowReturn: { fontSize: 13, fontWeight: '600' },
  empty: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    paddingHorizontal: 32,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    padding: Spacing.md,
  },
});
