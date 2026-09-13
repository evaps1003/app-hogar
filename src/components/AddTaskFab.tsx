import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface AddTaskFabProps {
  onPress: () => void;
}

export function AddTaskFab({ onPress }: AddTaskFabProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primaryStrong,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 104,
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});