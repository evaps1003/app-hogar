import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  onPressHeader?: () => void;
  expanded?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  children,
  style,
  onPressHeader,
  expanded = true,
}: SectionCardProps) {
  const { theme } = useTheme();

  const header = (
    <View style={styles.head}>
      <View style={styles.headText}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onPressHeader ? (
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.tabInactive}
        />
      ) : null}
    </View>
  );

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
      {onPressHeader ? (
        <Pressable onPress={onPressHeader} style={styles.headPressable}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      {expanded ? <View style={styles.body}>{children}</View> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  headText: {
    flex: 1,
  },
  headPressable: {
    marginBottom: 0,
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