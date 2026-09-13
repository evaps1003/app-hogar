import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';
import { Member, MemberColor } from '../data/types';

const COLOR_SOFT: Record<MemberColor, keyof Palette> = {
  primary: 'primarySoft',
  highlight: 'highlightSoft',
  accent: 'accentSoft',
};

const COLOR_STRONG: Record<MemberColor, keyof Palette> = {
  primary: 'primaryStrong',
  highlight: 'highlightStrong',
  accent: 'accentStrong',
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface MemberBadgeProps {
  member: Member;
  compact?: boolean;
}

export function MemberBadge({ member, compact = false }: MemberBadgeProps) {
  const { theme } = useTheme();
  const soft = theme.colors[COLOR_SOFT[member.color]];
  const strong = theme.colors[COLOR_STRONG[member.color]];

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: soft }]}>
      <View
        style={[
          styles.avatar,
          compact && styles.avatarCompact,
          { backgroundColor: strong },
        ]}
      >
        <Text style={[styles.avatarText, compact && styles.avatarTextCompact]}>
          {initialsOf(member.name)}
        </Text>
      </View>
      <Text
        style={[
          styles.name,
          compact && styles.nameCompact,
          { color: strong },
        ]}
      >
        {member.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 10,
    borderRadius: 999,
    gap: 6,
  },
  badgeCompact: {
    paddingRight: 8,
    gap: 4,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCompact: {
    width: 17,
    height: 17,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarTextCompact: {
    fontSize: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
  },
  nameCompact: {
    fontSize: 11,
  },
});