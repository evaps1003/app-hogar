import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SectionCard({
  title,
  subtitle,
  children,
  style,
}: SectionCardProps) {
  const { theme } = useTheme();

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
        style,
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  head: {
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  body: {
    marginTop: 10,
  },
});