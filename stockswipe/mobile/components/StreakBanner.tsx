import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  streakDays: number;
}

export function StreakBanner({ streakDays }: Props) {
  if (streakDays < 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.text}>
        {streakDays} day{streakDays > 1 ? 's' : ''} streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff690022',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ff6900',
    alignSelf: 'flex-start',
  },
  flame: {
    fontSize: 14,
    marginRight: 4,
  },
  text: {
    color: '#ff6900',
    fontSize: 12,
    fontWeight: '700',
  },
});
