import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Member, MemberColor } from '../data/types';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';
import { initialsOf } from './MemberBadge';

const COLOR_STRONG: Record<MemberColor, keyof Palette> = {
  primary: 'primaryStrong',
  highlight: 'highlightStrong',
  accent: 'accentStrong',
};

interface MemberAvatarProps {
  member: Member;
  size?: number;
}

export function MemberAvatar({ member, size = 34 }: MemberAvatarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: theme.colors[COLOR_STRONG[member.color]],
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>
        {initialsOf(member.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});