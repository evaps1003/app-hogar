import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Member, MemberColor, Task } from '../data/types';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';

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

interface TaskPillProps {
  task: Task;
  assignee?: Member;
  onPress?: () => void;
}

export function TaskPill({ task, assignee, onPress }: TaskPillProps) {
  const { theme } = useTheme();

  const bgColor = assignee
    ? theme.colors[COLOR_SOFT[assignee.color]]
    : theme.colors.surfaceVariant;
  const textColor = assignee
    ? theme.colors[COLOR_STRONG[assignee.color]]
    : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, { backgroundColor: bgColor }]}
    >
      {assignee && (
        <View
          style={[
            styles.circle,
            { backgroundColor: theme.colors[COLOR_STRONG[assignee.color]] },
          ]}
        >
          <Text style={styles.circleText}>
            {assignee.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.text, { color: textColor }]}
      >
        {task.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  text: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
});