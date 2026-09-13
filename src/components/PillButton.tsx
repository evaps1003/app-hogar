import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'strong' | 'ghost';
  disabled?: boolean;
}

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: PillButtonProps) {
  const { theme } = useTheme();

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed || disabled ? 0.6 : 1 })}
      >
        <Text
          style={[
            styles.ghostLabel,
            { color: theme.colors.textSecondary },
            disabled && { opacity: 0.5 },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  const background =
    variant === 'strong' ? theme.colors.primaryStrong : theme.colors.primary;
  const shadowColor =
    variant === 'strong' ? theme.colors.primaryStrong : theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled
            ? theme.colors.surfaceVariant
            : background,
          shadowColor: disabled ? 'transparent' : shadowColor,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: disabled ? 0 : 4,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: disabled ? theme.colors.textSecondary : '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
  ghostLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});