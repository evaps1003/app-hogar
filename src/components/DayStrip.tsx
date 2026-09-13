import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { DayOfWeek } from '../data/types';
import { DAY_SHORT_LABELS } from '../data/schedule';
import { useTheme } from '../theme';

const WEEK_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

interface DayItem {
  day: DayOfWeek;
  date: number;
  isToday: boolean;
}

function daysOfCurrentWeek(): DayItem[] {
  const today = new Date();
  const todayDow = today.getDay() as DayOfWeek;
  const mondayOffset = (todayDow + 6) % 7;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - mondayOffset,
  );
  return WEEK_ORDER.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { day, date: date.getDate(), isToday: day === todayDow };
  });
}

interface DayStripProps {
  selected: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
}

export function DayStrip({ selected, onSelect }: DayStripProps) {
  const { theme } = useTheme();
  const days = daysOfCurrentWeek();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((item) => {
        const active = selected === item.day;
        return (
          <Pressable
            key={item.day}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
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