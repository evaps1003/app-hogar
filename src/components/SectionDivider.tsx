import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface SectionDividerProps {
  label: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: theme.colors.divider }]} />
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.line, { backgroundColor: theme.colors.divider }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});