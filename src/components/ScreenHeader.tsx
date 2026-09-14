import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onPressTitle?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onPressTitle,
}: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.colors.primaryStrong }]}>
          {eyebrow}
        </Text>
      ) : null}
      <Pressable
        disabled={!onPressTitle}
        onPress={onPressTitle}
        hitSlop={8}
        style={({ pressed }) => pressed && { opacity: 0.5 }}
      >
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
      </Pressable>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
});