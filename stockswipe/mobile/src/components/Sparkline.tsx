import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Colors } from '../constants/theme';

interface Props {
  prices: number[];
  width?: number | string;
  height?: number;
}

export function Sparkline({ prices, width = '100%', height = 80 }: Props) {
  const data = useMemo(() => prices.map((y, x) => ({ x, y })), [prices]);

  if (data.length < 2) return <div style={{ height }} />;

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? Colors.green : Colors.red;
  const fill  = isUp ? Colors.greenDim : Colors.redDim;

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${isUp ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="y"
          stroke={color}
          strokeWidth={2}
          fill={`url(#sg-${isUp ? 'up' : 'dn'})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
