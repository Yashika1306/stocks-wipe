import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  tags: string[];
}

export function FactorTag({ tags }: Props) {
  return (
    <View style={styles.row}>
      {tags.slice(0, 3).map((tag, i) => (
        <View key={i} style={styles.tag}>
          <Text style={styles.text}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
});
