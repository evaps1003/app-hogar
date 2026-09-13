import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme';

interface NoticeToastProps {
  message: string | null;
  onDone: () => void;
}

export function NoticeToast({ message, onDone }: NoticeToastProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 2200);

    return () => clearTimeout(timer);
  }, [message, opacity, onDone]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity,
          backgroundColor: theme.colors.surface,
          shadowColor: theme.shadows.floating.shadowColor,
          shadowOpacity: theme.shadows.floating.shadowOpacity,
          shadowRadius: theme.shadows.floating.shadowRadius,
          shadowOffset: theme.shadows.floating.shadowOffset,
          elevation: theme.shadows.floating.elevation,
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.colors.textPrimary }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 104,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});