import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member, Task } from '../data/types';
import { useTheme } from '../theme';
import { CheckCircle } from './CheckCircle';
import { MemberBadge } from './MemberBadge';
import { MemberAvatar } from './MemberAvatar';
import { ScheduleBadge } from './ScheduleBadge';

interface TaskRowProps {
  task: Task;
  assignee?: Member;
  onPressCheck: () => void;
  muted?: boolean;
  locked?: boolean;
  onAssume?: () => void;
  onAvatarPress?: () => void;
  assignOpen?: boolean;
  members?: Member[];
  onAssign?: (assigneeId: string | null) => void;
  onPressEdit?: () => void;
  onDelete?: () => void;
}

export function TaskRow({
  task,
  assignee,
  onPressCheck,
  muted = false,
  locked = false,
  onAssume,
  onAvatarPress,
  assignOpen = false,
  members = [],
  onAssign,
  onPressEdit,
  onDelete,
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

  const hasQuickAssign = !!onAvatarPress && !task.completed && !task.enSubasta;
  const isSwapIncoming = !task.completed && task.enSubasta && !!onAssume;

  const legacyTask = task as Task & { name?: string };
  const titleText = (task.title ?? legacyTask.name ?? '').trim() || 'Tarea';

  const quickAvatar = () => {
    if (!hasQuickAssign) return null;
    return (
      <Pressable
        onPress={onAvatarPress}
        hitSlop={6}
        style={({ pressed }) => [
          styles.quickChip,
          {
            backgroundColor: theme.colors.surfaceVariant,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        {assignee ? (
          <MemberAvatar member={assignee} size={24} />
        ) : (
          <View
            style={[
              styles.commonAvatar,
              { backgroundColor: theme.colors.tabInactive },
            ]}
          >
            <Ionicons name="bag-handle-outline" size={13} color="#FFFFFF" />
          </View>
        )}
        <Ionicons
          name="chevron-down"
          size={12}
          color={theme.colors.tabInactive}
        />
      </Pressable>
    );
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
    if (task.enSubasta) {
      return (
        <View
          style={[
            styles.swapPill,
            { backgroundColor: theme.colors.highlightSoft },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={11}
            color={theme.colors.highlightStrong}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.swapPillText,
              { color: theme.colors.highlightStrong },
            ]}
          >
            Pendiente de relevo
          </Text>
        </View>
      );
    }
    if (hasQuickAssign) {
      return quickAvatar();
    }
    if (assignee) {
      return <MemberBadge member={assignee} compact />;
    }
    return null;
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, muted && styles.mutedRow]}>
        <CheckCircle
          checked={task.completed}
          onPress={handleCheckPress}
          size={26}
          disabled={locked}
        />
        <View style={styles.mainColumn}>
          {onPressEdit ? (
            <Pressable
              onPress={onPressEdit}
              hitSlop={4}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
            >
              <Text
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
                {titleText}
              </Text>
            </Pressable>
          ) : (
            <Text
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
              {titleText}
            </Text>
          )}
          {isSwapIncoming ? (
            <View style={styles.pillRow}>
              <View
                style={[
                  styles.swapPill,
                  { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={theme.colors.accentStrong}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.swapPillText,
                    { color: theme.colors.accentStrong },
                  ]}
                >
                  {assignee ? `${assignee.name} pide cambio` : 'Piden cambio'}
                </Text>
              </View>
              <Pressable
                onPress={onAssume}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.assumeButton,
                  {
                    backgroundColor: theme.colors.primaryStrong,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Ionicons name="hand-left" size={12} color="#FFFFFF" />
                <Text style={styles.assumeButtonText}>Asumir</Text>
              </Pressable>
            </View>
          ) : null}
          {!isSwapIncoming && (
            <View style={styles.metaRow}>
              {task.urgent && !task.completed ? (
                <View
                  style={[
                    styles.urgentPill,
                    { backgroundColor: theme.colors.warningSoft },
                  ]}
                >
                  <Ionicons
                    name="flame"
                    size={11}
                    color={theme.colors.warningStrong}
                  />
                  <Text
                    style={[
                      styles.urgentPillText,
                      { color: theme.colors.warningStrong },
                    ]}
                  >
                    Urgente
                  </Text>
                </View>
              ) : null}
              {!task.completed && !task.enSubasta && (
                <ScheduleBadge schedule={task.schedule} />
              )}
              {showRightBadge()}
            </View>
          )}
        </View>
        {onDelete && task.completed ? (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              { transform: [{ scale: pressed ? 0.85 : 1 }] },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.tabInactive}
            />
          </Pressable>
        ) : null}
      </View>

      {assignOpen && members.length > 0 && onAssign ? (
        <View
          style={[
            styles.assignPanel,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          {members.map((member) => {
            const selected = task.assigneeId === member.id;
            return (
              <Pressable
                key={member.id}
                onPress={() => onAssign!(member.id)}
                style={[
                  styles.assignChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surface,
                  },
                ]}
              >
                <MemberAvatar member={member} size={22} />
                <Text
                  style={[
                    styles.assignChipText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {member.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => onAssign!(null)}
            style={[
              styles.assignChip,
              {
                backgroundColor:
                  task.assigneeId === null
                    ? theme.colors.primaryStrong
                    : theme.colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.commonAvatar,
                {
                  backgroundColor:
                    task.assigneeId === null
                      ? '#FFFFFF'
                      : theme.colors.tabInactive,
                },
              ]}
            >
              <Ionicons
                name="bag-handle-outline"
                size={12}
                color={
                  task.assigneeId === null
                    ? theme.colors.primaryStrong
                    : '#FFFFFF'
                }
              />
            </View>
            <Text
              style={[
                styles.assignChipText,
                {
                  color:
                    task.assigneeId === null
                      ? '#FFFFFF'
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Bolsa
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  mutedRow: {
    opacity: 0.7,
  },
  mainColumn: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    flexShrink: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    textDecorationColor: '#C9BED1',
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  urgentPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  commonAvatar: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
  swapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 150,
  },
  swapPillText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  assumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  assumeButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  assignPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    marginBottom: 6,
  },
  assignChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  assignChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
});