import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../constants/theme';

interface Props {
  score: number;
}

function badgeColor(score: number): string {
  if (score >= 70) return Colors.green;
  if (score >= 40) return Colors.amber;
  return Colors.red;
}

export function ScoreBadge({ score }: Props) {
  const color = badgeColor(score);
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[styles.text, { color }]}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '700',
  },
});
