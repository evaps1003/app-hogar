import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskSchedule } from '../data/types';
import { formatSchedule } from '../data/schedule';
import { useTheme } from '../theme';

interface ScheduleBadgeProps {
  schedule?: TaskSchedule;
}

export function ScheduleBadge({ schedule }: ScheduleBadgeProps) {
  const { theme } = useTheme();
  if (!schedule) return null;

  const label = formatSchedule(schedule);
  if (!label) return null;

  const icon =
    schedule.type === 'flexible' || schedule.type === 'once'
      ? 'calendar-outline'
      : 'time-outline';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      <Ionicons name={icon} size={11} color={theme.colors.textSecondary} />
      <Text
        numberOfLines={1}
        style={[styles.text, { color: theme.colors.textSecondary }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 120,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});