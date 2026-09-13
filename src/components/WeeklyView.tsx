import React from 'react';
import { DAY_LABELS } from '../data/schedule';
import { DAY_LONG_LABELS } from '../data/schedule';
import { DayOfWeek } from '../data/types';
import { MemberAvatar } from './MemberAvatar';
import { useTheme } from '../theme';

export function DayStrip({ days, setDays, nextDay }: DayStripProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      {days.map((day) => (
        <Pressable
          key={day}
          onPress={() => setDays(day)}
          style={[
            styles.pill,
            {
              backgroundColor:
                theme.colors[day === currentDay ? 'primaryStrong' : 'surfaceVariant'],
              borderRadius: theme.radius.pill,
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: day === currentDay ? '#FFF' : theme.colors.textSecondary },
            ]}
          >
            {DAYS_ORDERED.map((d) => (d === day ? LONG_LABELS[d] : null))}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    height: 44,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontWeight: '700' },
});
