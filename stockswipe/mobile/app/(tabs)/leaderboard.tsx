import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../../constants/api';
import { Colors, Spacing } from '../../constants/theme';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  total_return: number;
  swipe_count: number;
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <Text style={styles.rank}>{medals[rank] ?? `#${rank}`}</Text>
  );
}

function EntryRow({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  return (
    <View style={[styles.row, isYou && styles.youRow]}>
      <RankBadge rank={entry.rank} />
      <View style={styles.nameCol}>
        <Text style={styles.name}>{entry.display_name}{isYou ? ' (You)' : ''}</Text>
        <Text style={styles.swipes}>{entry.swipe_count} swipes</Text>
      </View>
      <Text style={[
        styles.returnText,
        { color: entry.total_return >= 0 ? Colors.green : Colors.red },
      ]}>
        {entry.total_return >= 0 ? '+' : ''}{entry.total_return.toFixed(2)}%
      </Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [weekReset, setWeekReset] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(setUserId);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    AsyncStorage.getItem('auth_token').then(token => {
      axios
        .get(`${API_BASE_URL}${ENDPOINTS.leaderboard}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ data }) => {
          setEntries(data.entries);
          setYourRank(data.your_rank);
          setWeekReset(data.week_reset);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [userId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        {weekReset && (
          <Text style={styles.reset}>Resets {weekReset}</Text>
        )}
      </View>

      {yourRank && (
        <View style={styles.yourRankBanner}>
          <Text style={styles.yourRankText}>Your rank: #{yourRank}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={e => String(e.rank)}
          renderItem={({ item }) => (
            <EntryRow entry={item} isYou={item.rank === yourRank} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No rankings yet — start swiping!</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  reset: { color: Colors.textMuted, fontSize: 12 },
  yourRankBanner: {
    backgroundColor: Colors.blue + '22',
    borderColor: Colors.blue,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  yourRankText: { color: Colors.blue, fontWeight: '700', textAlign: 'center' },
  list: { paddingHorizontal: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  youRow: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 8, marginVertical: 2 },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  nameCol: { flex: 1, gap: 2 },
  name: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  swipes: { color: Colors.textMuted, fontSize: 11 },
  returnText: { fontWeight: '700', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
