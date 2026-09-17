import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SectionDivider } from '../components/SectionDivider';
import { EmptyLine } from '../components/EmptyLine';
import { EmptyState } from '../components/EmptyState';
import { TaskRow } from '../components/TaskRow';
import { MemberBadge } from '../components/MemberBadge';
import { AddTaskFab } from '../components/AddTaskFab';
import { NewTaskForm } from '../components/NewTaskForm';
import { useTasks } from '../data/TaskContext';
import { useHousehold } from '../data/HouseholdContext';
import {
  BUILTIN_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CUSTOM_CATEGORY_ICON,
} from '../data/categories';
import { useTheme } from '../theme';
import { MemberColor, Task, TaskCategory } from '../data/types';
import { NewCategoryModal } from '../components/NewCategoryModal';

type ViewMode = 'categorias' | 'miembros';

const CATEGORY_STYLE: Record<
  string,
  { iconColor: keyof import('../theme/palettes').Palette; bg: 'surfaceVariant' }
> = {
  limpieza: { iconColor: 'infoStrong', bg: 'surfaceVariant' },
  cocina: { iconColor: 'warningStrong', bg: 'surfaceVariant' },
  otros: { iconColor: 'primaryStrong', bg: 'surfaceVariant' },
};

const MEMBER_STRONG: Record<
  MemberColor,
  keyof import('../theme/palettes').Palette
> = {
  primary: 'primaryStrong',
  highlight: 'highlightStrong',
  accent: 'accentStrong',
};


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
    swapRequests,
    assumeTask,
    deleteTask,
  } = useTasks();
  const {
    getMemberById,
    activeMember,
    members,
    categories,
    addCategory,
  } = useHousehold();
  const { theme } = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('categorias');
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [swapExpanded, setSwapExpanded] = useState(false);
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<TaskCategory>
  >(() => new Set(['limpieza', 'cocina', 'otros']));

  useEffect(() => {
    setCollapsedMembers((prev) => {
      const next = new Set(prev);
      let changed = false;
      members.forEach((m) => {
        if (!next.has(m.id)) {
          next.add(m.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [members]);

  const canCreate = activeMember?.householdRole !== 'supervised';

  if (activeMember?.householdRole === 'supervised') {
    return (
      <Screen>
        <ScreenHeader title="Tareas" subtitle="Pendientes y reparto de tareas" />
        <EmptyState
          icon="lock-closed-outline"
          title="Sin acceso"
          message="Solo los líderes y co-admins gestionan el reparto de tareas."
        />
      </Screen>
    );
  }

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

  const toggleCategory = (cat: TaskCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const openNewForm = () => {
    setEditingTask(null);
    setFormVisible(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingTask(null);
  };

  const pendingByMember = new Map<string, Task[]>();
  const doneByMember = new Map<string, Task[]>();
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

  const pendingByCategory = useMemo(() => {
    const allPending: Task[] = [
      ...pendingFree,
      ...pendingAssigned.filter((t) => !t.enSubasta),
    ];
    const map = new Map<TaskCategory, Task[]>(
      (['limpieza', 'cocina', 'otros'] as TaskCategory[]).map((key) => [
        key,
        [],
      ]),
    );
    allPending.forEach((task) => {
      const key: TaskCategory = task.category ?? 'otros';
      map.get(key)!.push(task);
    });
    return map;
  }, [pendingFree, pendingAssigned]);

  const doneByCategory = useMemo(() => {
    const allDone: Task[] = [...doneFree, ...doneAssigned];
    const map = new Map<TaskCategory, Task[]>(
      (['limpieza', 'cocina', 'otros'] as TaskCategory[]).map((key) => [
        key,
        [],
      ]),
    );
    allDone.forEach((task) => {
      const key: TaskCategory = task.category ?? 'otros';
      map.get(key)!.push(task);
    });
    return map;
  }, [doneFree, doneAssigned]);

  const categoryList = useMemo(() => {
    const known = new Set<string>(BUILTIN_CATEGORIES);
    categories.forEach((c) => known.add(c));
    pendingByCategory.forEach((_, key) => known.add(key));
    doneByCategory.forEach((_, key) => known.add(key));
    return [...known];
  }, [categories, pendingByCategory, doneByCategory]);


  return (
    <>
      <Screen
        overlay={
          canCreate ? (
            <AddTaskFab onPress={openNewForm} />
          ) : undefined
        }
      >
        <ScreenHeader
          title="Reparto"
          subtitle="Gestión del reparto del hogar"
        />

        <View style={styles.toggleRow}>
          {([
            { key: 'categorias' as const, label: 'Categorías', icon: 'layers-outline' as const },
            { key: 'miembros' as const, label: 'Miembros', icon: 'people-outline' as const },
          ]).map(({ key, label, icon }) => {
            const selected = viewMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setViewMode(key)}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={15}
                  color={
                    selected ? '#FFFFFF' : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {swapRequests.length > 0 ? (
          <SectionCard
            title="Petición de relevo"
            onPressHeader={() => setSwapExpanded((v) => !v)}
            expanded={swapExpanded}
            style={{
              backgroundColor: theme.colors.warningSoft,
              borderWidth: 1.5,
              borderColor: theme.colors.warningStrong,
            }}
          >
            <View style={styles.list}>
              {swapRequests.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignee={getMemberById(task.assigneeId)}
                  onPressCheck={() => toggleAssigned(task.id)}
                  locked={!canCheckTask(task)}
                  onAssume={() => assumeTask(task.id)}
                />
              ))}
            </View>
          </SectionCard>
        ) : null}

        {viewMode === 'categorias' ? (
          <>
            {categoryList.map((cat) => {
              const catTasks = pendingByCategory.get(cat) ?? [];
              const catDone = doneByCategory.get(cat) ?? [];
              const style = CATEGORY_STYLE[cat] ?? {
                iconColor: 'highlightStrong' as keyof typeof theme.colors,
                bg: 'surfaceVariant' as const,
              };
              return (
                <View
                  key={cat}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: theme.colors[style.bg],
                      borderRadius: 20,
                      shadowOpacity: 0,
                      elevation: 0,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => toggleCategory(cat)}
                    style={styles.categoryHeader}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        {
                          backgroundColor:
                            theme.colors[style.iconColor],
                        },
                      ]}
                    >
<Ionicons
                          name={
                            (CATEGORY_ICONS[cat] ??
                              CUSTOM_CATEGORY_ICON) as keyof typeof Ionicons.glyphMap
                          }
                          size={15}
                          color="#FFFFFF"
                        />
                    </View>
                    <Text
                      style={[
                        styles.categoryTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </Text>
                    <Text
                      style={[
                        styles.categoryCount,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {catTasks.length} pendiente
                      {catTasks.length !== 1 ? 's' : ''}
                      {catDone.length > 0
                        ? ` · ${catDone.length} hecha${catDone.length !== 1 ? 's' : ''}`
                        : ''}
                    </Text>
                    <Ionicons
                      name={
                        collapsedCategories.has(cat)
                          ? 'chevron-forward'
                          : 'chevron-down'
                      }
                      size={18}
                      color={theme.colors.tabInactive}
                    />
                  </Pressable>
                  {!collapsedCategories.has(cat) ? (
                    <View style={styles.categoryBody}>
                      {catTasks.length === 0 &&
                      catDone.length === 0 ? (
                        <EmptyLine message="Sin tareas pendientes" />
                      ) : (
                        <>
                          {catTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              assignee={getMemberById(task.assigneeId)}
                              onPressCheck={() =>
                                task.assigneeId
                                  ? toggleAssigned(task.id)
                                  : claimFreeTask(task.id)
                              }
                              locked={!canCheckTask(task)}
                              onPressEdit={() => openEditForm(task)}
                            />
                          ))}
                          {catDone.length > 0 ? (
                            <>
                              <SectionDivider label="Completadas" />
                              {catDone.map((task) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  assignee={getMemberById(task.assigneeId)}
                                  onPressCheck={() =>
                                    task.assigneeId
                                      ? toggleAssigned(task.id)
                                      : reopen(task.id)
                                  }
                                  locked={!canCheckTask(task)}
                                  muted
                                  onDelete={() => deleteTask(task.id)}
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
            <Pressable
              onPress={() => setCategoryModalVisible(true)}
              style={styles.newCategoryButton}
            >
              <Ionicons
                name="add"
                size={18}
                color={theme.colors.primaryStrong}
              />
              <Text
                style={[
                  styles.newCategoryText,
                  { color: theme.colors.primaryStrong },
                ]}
              >
                Nueva categoría
              </Text>
            </Pressable>
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
                              onAssume={
                                !task.completed &&
                                task.enSubasta &&
                                task.assigneeId !== activeMember?.id
                                  ? () => assumeTask(task.id)
                                  : undefined
                              }
                              onPressEdit={() => openEditForm(task)}
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
                                  onDelete={() => deleteTask(task.id)}
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
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: 20,
                shadowOpacity: 0,
                elevation: 0,
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
                        onPressEdit={() => openEditForm(task)}
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
                            onDelete={() => deleteTask(task.id)}
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
        visible={formVisible || !!editingTask}
        task={editingTask}
        onClose={closeForm}
      />
      <NewCategoryModal
        visible={categoryModalVisible}
        existing={[
          ...BUILTIN_CATEGORIES,
          ...(categories ?? []),
        ]}
        onClose={() => setCategoryModalVisible(false)}
        onCreate={(name) => {
          addCategory(name);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  toggleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 44,
    borderRadius: 999,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBody: {
    marginTop: 10,
    gap: 2,
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
  newCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  newCategoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});