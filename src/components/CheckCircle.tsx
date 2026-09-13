import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface CheckCircleProps {
  checked: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}

export function CheckCircle({
  checked,
  onPress,
  size = 28,
  disabled = false,
}: CheckCircleProps) {
  const { theme } = useTheme();
  const lockColor = theme.colors.tabInactive;

  const circle = disabled
    ? {
        backgroundColor: checked ? theme.colors.accentStrong : 'transparent',
        borderWidth: checked ? 0 : 1.5,
        borderColor: checked ? 'transparent' : lockColor + '70',
        opacity: checked ? 0.5 : 0.65,
      }
    : {
        backgroundColor: checked ? theme.colors.accentStrong : 'transparent',
        borderWidth: checked ? 0 : 2,
        borderColor: checked ? 'transparent' : theme.colors.tabInactive + '60',
        shadowColor: checked ? theme.colors.accentStrong : 'transparent',
        shadowOpacity: checked ? 0.25 : 0,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: checked ? 2 : 0,
      };

  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.press}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: 999,
          },
          circle,
        ]}
      >
        {disabled ? (
          <Ionicons
            name="lock-closed"
            size={size - 17}
            color={lockColor}
          />
        ) : checked ? (
          <Ionicons
            name="checkmark"
            size={size - 12}
            color="#FFFFFF"
            style={styles.check}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    alignSelf: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    marginLeft: 1,
  },
});