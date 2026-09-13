import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconTint?: 'primary' | 'highlight' | 'accent';
  title: string;
  message: string;
}

const ICON_BADGE: Record<
  NonNullable<EmptyStateProps['iconTint']>,
  { background: keyof Palette; icon: keyof Palette }
> = {
  primary: { background: 'primarySoft', icon: 'primary' },
  highlight: { background: 'highlightSoft', icon: 'highlightStrong' },
  accent: { background: 'accentSoft', icon: 'accentStrong' },
};

export function EmptyState({
  icon,
  iconTint = 'primary',
  title,
  message,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const badge = ICON_BADGE[iconTint];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          shadowColor: theme.shadows.card.shadowColor,
          shadowOpacity: theme.shadows.card.shadowOpacity,
          shadowRadius: theme.shadows.card.shadowRadius,
          shadowOffset: theme.shadows.card.shadowOffset,
          elevation: theme.shadows.card.elevation,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors[badge.background] },
        ]}
      >
        <Ionicons name={icon} size={30} color={theme.colors[badge.icon]} />
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});