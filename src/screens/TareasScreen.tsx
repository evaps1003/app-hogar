import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SectionDivider } from '../components/SectionDivider';
import { EmptyLine } from '../components/EmptyLine';
import { TaskRow } from '../components/TaskRow';
import { MemberBadge } from '../components/MemberBadge';
import { AddTaskFab } from '../components/AddTaskFab';
import { NewTaskForm } from '../components/NewTaskForm';
import { WeeklyView } from '../components/WeeklyView';
import { useTasks } from '../data/TaskContext';
import { useHousehold } from '../data/HouseholdContext';
import { DayOfWeek } from '../data/types';
import { useTheme } from '../theme';

type ViewMode = 'reparto' | 'semanal';

export function TareasScreen() {
  const {
    pendingAssigned,
    doneAssigned,
    pendingFree,
    doneFree,
    toggleAssigned,
    claimFreeTask,
    reopen,
    canCheckTask,
  } = useTasks();
  const { getMemberById, activeMember, members } = useHousehold();
  const { theme } = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('reparto');
  const [formVisible, setFormVisible] = useState(false);
  const [formInitialDay, setFormInitialDay] = useState<DayOfWeek | undefined>(
    undefined,
  );
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(
    () => new Set(),
  );

  const canCreate = activeMember?.householdRole !== 'supervised';

  const toggleMember = (id: string) => {
    setCollapsedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openGeneralForm = () => {
    setFormInitialDay(undefined);
    setFormVisible(true);
  };

  const openFormForDay = (day: DayOfWeek) => {
    setFormInitialDay(day);
    setFormVisible(true);
  };

  const pendingByMember = new Map<string, typeof pendingAssigned>();
  const doneByMember = new Map<string, typeof doneAssigned>();
  pendingAssigned.forEach((task) => {
    const list = pendingByMember.get(task.assigneeId!) ?? [];
    list.push(task);
    pendingByMember.set(task.assigneeId!, list);
  });
  doneAssigned.forEach((task) => {
    const list = doneByMember.get(task.assigneeId!) ?? [];
    list.push(task);
    doneByMember.set(task.assigneeId!, list);
  });

  return (
    <>
      <Screen
        overlay={
          canCreate ? <AddTaskFab onPress={openGeneralForm} /> : undefined
        }
      >
        <ScreenHeader
          title="Tareas"
          eyebrow="Hogar"
          subtitle="Pendientes y reparto de tareas"
        />

        <View
          style={[
            styles.segment,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radius.pill,
            },
          ]}
        >
          {(
            [
              { key: 'reparto' as ViewMode, label: 'Reparto' },
              { key: 'semanal' as ViewMode, label: 'Vista Semanal' },
            ] as { key: ViewMode; label: string }[]
          ).map((option) => {
            const active = viewMode === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setViewMode(option.key)}
                style={[
                  styles.segmentOption,
                  active && {
                    backgroundColor: theme.colors.surface,
                    shadowColor: theme.shadows.soft.shadowColor,
                    shadowOpacity: theme.shadows.soft.shadowOpacity,
                    shadowRadius: theme.shadows.soft.shadowRadius,
                    shadowOffset: theme.shadows.soft.shadowOffset,
                    elevation: theme.shadows.soft.elevation,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: active
                        ? theme.colors.primaryStrong
                        : theme.colors.textSecondary,
                      fontWeight: active ? '800' : '500',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {viewMode === 'semanal' ? (
          <>
            <WeeklyView onAddTaskForDay={openFormForDay} />
            <Text
              style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Toca un día para programar una tarea asignada o libre en esa
              fecha.
            </Text>
          </>
        ) : (
          <>
            {members.map((member) => {
              const pending = pendingByMember.get(member.id) ?? [];
              const done = doneByMember.get(member.id) ?? [];
              const collapsed = collapsedMembers.has(member.id);
              return (
                <View
                  key={member.id}
                  style={[
                    styles.memberCard,
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
                  <Pressable
                    onPress={() => toggleMember(member.id)}
                    style={styles.memberHeader}
                  >
                    <MemberBadge member={member} compact />
                    <Text
                      style={[
                        styles.memberCount,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
                    </Text>
                    <Ionicons
                      name={collapsed ? 'chevron-forward' : 'chevron-down'}
                      size={18}
                      color={theme.colors.tabInactive}
                    />
                  </Pressable>
                  {!collapsed ? (
                    <View style={styles.memberBody}>
                      {pending.length === 0 && done.length === 0 ? (
                        <EmptyLine message="Sin tareas asignadas" />
                      ) : (
                        <>
                          {pending.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              assignee={member}
                              onPressCheck={() => toggleAssigned(task.id)}
                              locked={!canCheckTask(task)}
                            />
                          ))}
                          {done.length > 0 ? (
                            <>
                              <SectionDivider label="Completadas" />
                              {done.map((task) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  assignee={member}
                                  onPressCheck={() => toggleAssigned(task.id)}
                                  locked={!canCheckTask(task)}
                                  muted
                                />
                              ))}
                            </>
                          ) : null}
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <SectionCard
              title="Bolsa Común"
              subtitle="Tareas libres para quien pueda"
              style={{
                backgroundColor: theme.colors.accentSoft,
                borderWidth: 1.5,
                borderColor: theme.colors.accentStrong,
              }}
            >
              <View style={styles.list}>
                {pendingFree.length === 0 && doneFree.length === 0 ? (
                  <EmptyLine message="La bolsa está vacía" />
                ) : (
                  <>
                    {pendingFree.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onPressCheck={() => claimFreeTask(task.id)}
                      />
                    ))}
                    {doneFree.length > 0 ? (
                      <>
                        <SectionDivider label="Con sello" />
                        {doneFree.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onPressCheck={() => reopen(task.id)}
                            muted
                          />
                        ))}
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </SectionCard>
          </>
        )}
      </Screen>

      <NewTaskForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        initialDay={formInitialDay}
      />
    </>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 18,
  },
  segmentOption: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 20,
  },
  memberCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberCount: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  memberBody: {
    marginTop: 12,
    gap: 2,
  },
  list: {
    gap: 2,
  },
});