import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeed, StockCard } from '../../hooks/useFeed';
import { useSwipe, SwipeDirection } from '../../hooks/useSwipe';
import { CardStack } from '../../components/CardStack';
import { StreakBanner } from '../../components/StreakBanner';
import { Colors } from '../../constants/theme';

export default function SwipeScreen() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [streak, setStreak] = React.useState(0);
  const cardShownAt = useRef(Date.now());

  React.useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setUserId(id));
    AsyncStorage.getItem('streak_days').then(s => setStreak(Number(s ?? 0)));
  }, []);

  const { cards, loading, error, popCard } = useFeed(userId ?? '');
  const { emitSwipe } = useSwipe();

  const handleSwipe = useCallback(
    (card: StockCard, direction: SwipeDirection) => {
      if (!userId) return;
      emitSwipe({
        userId,
        ticker: card.ticker,
        direction,
        cardScore: card.composite_score,
        cardShownAt: cardShownAt.current,
      });
      popCard();
      cardShownAt.current = Date.now();
    },
    [userId, emitSwipe, popCard],
  );

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>StockSwipe</Text>
        <StreakBanner streakDays={streak} />
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>← Pass  •  Bullish →  •  ↑ Portfolio</Text>
      </View>

      {loading && cards.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.green} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <CardStack cards={cards} onSwipe={handleSwipe} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hint: {
    marginTop: 8,
    marginBottom: 12,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
  },
  mutedText: {
    color: Colors.textMuted,
  },
});
