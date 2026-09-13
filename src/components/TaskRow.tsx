import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member, Task } from '../data/types';
import { useTheme } from '../theme';
import { CheckCircle } from './CheckCircle';
import { MemberBadge } from './MemberBadge';
import { ScheduleBadge } from './ScheduleBadge';

interface TaskRowProps {
  task: Task;
  assignee?: Member;
  onPressCheck: () => void;
  muted?: boolean;
  locked?: boolean;
}

export function TaskRow({
  task,
  assignee,
  onPressCheck,
  muted = false,
  locked = false,
}: TaskRowProps) {
  const { theme } = useTheme();
  const [hintVisible, setHintVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCheckPress = () => {
    if (!locked) {
      onPressCheck();
      return;
    }
    setHintVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHintVisible(false), 2000);
  };

  const showRightBadge = () => {
    if (task.completed && task.completedBy) {
      return (
        <View
          style={[
            styles.donePill,
            { backgroundColor: theme.colors.primarySoft },
          ]}
        >
          <Text
            style={[
              styles.donePillText,
              { color: theme.colors.primaryStrong },
            ]}
          >
            Hecho por {task.completedBy}
          </Text>
        </View>
      );
    }
    if (hintVisible && assignee) {
      return (
        <View
          style={[
            styles.lockPill,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={11}
            color={theme.colors.tabInactive}
          />
          <Text
            style={[styles.lockPillText, { color: theme.colors.tabInactive }]}
          >
            Solo la toca {assignee.name}
          </Text>
        </View>
      );
    }
    if (assignee && task.rotacion) {
      return (
        <View
          style={[
            styles.turnPill,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Ionicons
            name="repeat"
            size={11}
            color={theme.colors.primaryStrong}
          />
          <Text
            numberOfLines={1}
            style={[styles.turnPillText, { color: theme.colors.textSecondary }]}
          >
            Turno: {assignee.name}
          </Text>
        </View>
      );
    }
    if (assignee) {
      return <MemberBadge member={assignee} compact />;
    }
    return null;
  };

  return (
    <View style={[styles.row, muted && styles.mutedRow]}>
      <CheckCircle
        checked={task.completed}
        onPress={handleCheckPress}
        size={26}
        disabled={locked}
      />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.title,
          {
            color: task.completed
              ? theme.colors.textSecondary
              : theme.colors.textPrimary,
          },
          task.completed && styles.completedTitle,
        ]}
      >
        {task.title}
      </Text>
      {!task.completed && <ScheduleBadge schedule={task.schedule} />}
      {showRightBadge()}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 48,
  },
  mutedRow: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    textDecorationColor: '#C9BED1',
  },
  donePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 132,
  },
  turnPillText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
});