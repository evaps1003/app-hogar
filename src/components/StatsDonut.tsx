import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

export interface DonutSegment {
  label: string;
  color: string;
  amountText: string;
  pctText: string;
  fraction: number;
}

interface StatsDonutProps {
  segments: DonutSegment[];
  totalText: string;
  totalLabel?: string;
  holeColor: string;
  size?: number;
  thickness?: number;
}

export function StatsDonut({
  segments,
  totalText,
  totalLabel = 'Total',
  holeColor,
  size = 176,
  thickness = 26,
}: StatsDonutProps) {
  const { theme } = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.donutBox}>
        <Svg width={size} height={size}>
          {segments.map((segment, index) => {
            if (segment.fraction <= 0) return null;
            const start = acc;
            acc += segment.fraction;
            const dash = Math.max(
              segment.fraction * circumference - 2,
              0,
            );
            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={-start * circumference}
                strokeLinecap="butt"
              />
            );
          })}
        </Svg>
        <View
          pointerEvents="none"
          style={[styles.totalWrap, { width: size, height: size }]}
        >
          <Text style={[styles.totalText, { color: theme.colors.textPrimary }]}>
            {totalText}
          </Text>
          <Text
            style={[styles.totalLabel, { color: theme.colors.textSecondary }]}
          >
            {totalLabel}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <Text
              numberOfLines={1}
              style={[styles.legendLabel, { color: theme.colors.textPrimary }]}
            >
              {segment.label}
            </Text>
            <Text
              style={[
                styles.legendAmount,
                { color: theme.colors.textPrimary },
              ]}
            >
              {segment.amountText}
            </Text>
            <Text
              style={[styles.legendPct, { color: theme.colors.textSecondary }]}
            >
              {segment.pctText}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  donutBox: {
    position: 'relative',
  },
  totalWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalText: {
    fontSize: 21,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  legend: {
    marginTop: 18,
    alignSelf: 'stretch',
    gap: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
});