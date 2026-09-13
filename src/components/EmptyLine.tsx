import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface EmptyLineProps {
  message: string;
}

export function EmptyLine({ message }: EmptyLineProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Ionicons
        name="checkmark-circle"
        size={18}
        color={theme.colors.accentStrong}
      />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});