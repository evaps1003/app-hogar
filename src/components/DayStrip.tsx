import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek } from '../data/types';
import { DAY_SHORT_LABELS } from '../data/schedule';
import { useTheme } from '../theme';

const WINDOW = 5;
const INITIAL_START = -2;

interface DayItem {
  key: string;
  day: DayOfWeek;
  date: number;
  isToday: boolean;
}

function daysWindow(today: Date, startOffset: number): DayItem[] {
  return Array.from({ length: WINDOW }, (_, i) => {
    const offset = startOffset + i;
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
    );
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.getDay() as DayOfWeek,
      date: date.getDate(),
      isToday: offset === 0,
    };
  });
}

interface DayStripProps {
  selected: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
}

export function DayStrip({ selected, onSelect }: DayStripProps) {
  const { theme } = useTheme();
  const [startOffset, setStartOffset] = useState(INITIAL_START);
  const days = daysWindow(new Date(), startOffset);

  const prevBlock = () => setStartOffset((v) => v - WINDOW);
  const nextBlock = () => setStartOffset((v) => v + WINDOW);

  const arrowColor = theme.colors.primaryStrong;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surfaceVariant, borderRadius: 20 },
      ]}
    >
      <Pressable
        onPress={prevBlock}
        hitSlop={8}
        style={[styles.arrow, { borderColor: theme.colors.surfaceVariant }]}
        testID="day-prev"
      >
        <Ionicons name="chevron-back" size={22} color={arrowColor} />
      </Pressable>

      {days.map((item) => {
        const active = selected === item.day;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.day)}
            style={[
              styles.chip,
              {
                backgroundColor: active
                  ? theme.colors.primaryStrong
                  : theme.colors.surface,
                borderWidth: 1.5,
                borderColor:
                  item.isToday && !active
                    ? theme.colors.accentStrong
                    : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.weekday,
                { color: active ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              {item.isToday ? 'Hoy' : DAY_SHORT_LABELS[item.day]}
            </Text>
            <Text
              style={[
                styles.daynum,
                {
                  color: active
                    ? '#FFFFFF'
                    : theme.colors.textPrimary,
                },
              ]}
            >
              {item.date}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={nextBlock}
        hitSlop={8}
        style={[styles.arrow, { borderColor: theme.colors.surfaceVariant }]}
        testID="day-next"
      >
        <Ionicons name="chevron-forward" size={22} color={arrowColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    gap: 2,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '700',
  },
  daynum: {
    fontSize: 15,
    fontWeight: '800',
  },
});