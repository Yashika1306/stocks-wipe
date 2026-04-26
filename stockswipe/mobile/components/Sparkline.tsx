import React, { useMemo } from 'react';
import { View } from 'react-native';
import { VictoryArea } from 'victory-native';
import { Colors } from '../constants/theme';

interface Props {
  prices: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ prices, width = 300, height = 80 }: Props) {
  const data = useMemo(
    () => prices.map((y, x) => ({ x, y })),
    [prices],
  );

  if (data.length < 2) return <View style={{ width, height }} />;

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? Colors.green : Colors.red;
  const fillColor = isUp ? Colors.greenDim : Colors.redDim;

  return (
    <View style={{ width, height }}>
      <VictoryArea
        width={width}
        height={height}
        data={data}
        padding={{ top: 4, bottom: 4, left: 0, right: 0 }}
        style={{
          data: {
            stroke: color,
            strokeWidth: 2,
            fill: fillColor,
          },
        }}
      />
    </View>
  );
}
