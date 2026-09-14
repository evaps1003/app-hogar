import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DayOfWeek, MemberColor, Task, TaskCategory } from '../data/types';
import {
  getCurrentWeekKey,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  WEEKDAY_ORDER,
} from '../data/schedule';
import { NewCategoryModal } from '../components/NewCategoryModal';

type ViewMode = 'categorias' | 'miembros' | 'dias';

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

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function dateKeyOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function taskTimeOf(task: Task): string {
  const s = task.schedule;
  if (!s || s.type === 'flexible') return '';
  return s.type === 'once' ? s.time ?? '' : s.time ?? s.timeStart ?? '';
}

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
    assignTask,
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
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );
  const [collapsedCategories, setCollapsedCategories] = useState<
    Set<TaskCategory>
  >(() => new Set(['limpieza', 'cocina', 'otros']));
  const [selectedDateKeys, setSelectedDateKeys] = useState<Set<string>>(
    () => new Set([dateKeyOf(new Date())]),
  );

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

  const toggleAssign = (taskId: string) => {
    setAssigningTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleAssign = (taskId: string, assigneeId: string | null) => {
    assignTask(taskId, assigneeId);
    setAssigningTaskId(null);
  };

  const openNewForm = () => {
    setEditingTask(null);
    setAssigningTaskId(null);
    setFormVisible(true);
  };

  const openEditForm = (task: Task) => {
    setAssigningTaskId(null);
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

  const matchesDate = useCallback(
    (task: Task, date: Date) => {
      const dow = date.getDay() as DayOfWeek;
      const dateKey = getCurrentWeekKey(date);
      const todayStr = new Date().toDateString();
      const s = task.schedule;
      if (!s) return date.toDateString() === todayStr;
      if (s.type === 'flexible') return s.weekKey === dateKey;
      if (s.type === 'once') {
        const dueDate = new Date(s.dueDate + 'T00:00:00');
        return dueDate.toDateString() === date.toDateString();
      }
      if (!s.days.includes(dow)) return false;
      return s.repeatWeekly || s.weekKey === dateKey;
    },
    [],
  );

  const tasksOnDate = useCallback(
    (date: Date) =>
      [...pendingFree, ...pendingAssigned]
        .filter((t) => !t.completed && matchesDate(t, date))
        .sort((a, b) => {
          const ta = taskTimeOf(a);
          const tb = taskTimeOf(b);
          if (ta !== tb) return ta.localeCompare(tb);
          return a.title.localeCompare(b.title);
        }),
    [pendingFree, pendingAssigned, matchesDate],
  );

  const monthView = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay() as DayOfWeek;
    const startOffset = (firstDow + 6) % 7;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length < totalCells) cells.push(null);

    const dayTasksMap = new Map<number, Task[]>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const matched = tasksOnDate(date);
      if (matched.length > 0) dayTasksMap.set(d, matched);
    }

    const monthDates = Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    );

    return {
      cells,
      dayTasksMap,
      monthDates,
      todayDate: now.getDate(),
      todayMonth: now.getMonth(),
    };
  }, [tasksOnDate]);

  const toggleDateKey = (dateKey: string) => {
    setSelectedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        if (next.size === 1) return prev;
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const selectedDateList = useMemo(
    () =>
      monthView.monthDates
        .filter((d) => selectedDateKeys.has(dateKeyOf(d)))
        .sort((a, b) => a.getTime() - b.getTime()),
    [monthView.monthDates, selectedDateKeys],
  );

  const selectedWeekdays = useMemo(() => {
    const dows = new Set<DayOfWeek>();
    selectedDateKeys.forEach((key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      dows.add(date.getDay() as DayOfWeek);
    });
    return WEEKDAY_ORDER.filter((dow) => dows.has(dow));
  }, [selectedDateKeys]);

  const selectedDayBlocks = useMemo(
    () =>
      selectedDateList.map((date) => ({
        date,
        tasks: tasksOnDate(date),
        isToday:
          date.toDateString() === new Date().toDateString(),
      })),
    [selectedDateList, tasksOnDate],
  );

  const formatDayHeader = (date: Date) => {
    const dow = date.getDay() as DayOfWeek;
    const isToday = date.toDateString() === new Date().toDateString();
    return `${DAY_SHORT_LABELS[dow].toUpperCase()} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}${isToday ? ' · Hoy' : ''}`;
  };

  const renderQuickAssignProps = (task: Task) => ({
    onAvatarPress: task.completed
      ? undefined
      : () => toggleAssign(task.id),
    assignOpen: assigningTaskId === task.id,
    members,
    onAssign: (assigneeId: string | null) =>
      handleAssign(task.id, assigneeId),
    onPressEdit: () => openEditForm(task),
  });

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
            { key: 'dias' as const, label: 'Por Días', icon: 'calendar-outline' as const },
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
              const isBuiltin = (BUILTIN_CATEGORIES as string[]).includes(cat);
              if (isBuiltin && catTasks.length === 0 && catDone.length === 0) {
                return null;
              }
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
                          {...renderQuickAssignProps(task)}
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
                            />
                          ))}
                        </>
                      ) : null}
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
        ) : viewMode === 'dias' ? (
          <>
            {(() => {
              const { cells, dayTasksMap, todayDate, todayMonth } = monthView;
              const now = new Date();
              const isCurrentMonth = now.getMonth() === todayMonth;
              const totalRows = cells.length / 7;
              const colPct = 100 / 7;
              const LANES = 6;

              const withOpacity = (hex: string, alpha: number) => {
                const h = hex.replace('#', '');
                const full =
                  h.length === 3
                    ? h.split('').map((c) => c + c).join('')
                    : h;
                const int = parseInt(full, 16);
                const r = (int >> 16) & 255;
                const g = (int >> 8) & 255;
                const b = int & 255;
                return `rgba(${r},${g},${b},${alpha})`;
              };

              const CATEGORY_STRONG: Record<string, string> = {
                limpieza: theme.colors.infoStrong,
                cocina: theme.colors.warningStrong,
                otros: theme.colors.primaryStrong,
              };

              const taskColor = (t: Task) => {
                if (t.assigneeId) {
                  const m = getMemberById(t.assigneeId);
                  if (m)
                    return theme.colors[
                      MEMBER_STRONG[m.color] as keyof typeof theme.colors
                    ];
                }
                const cat = t.category ?? 'otros';
                const fixed: string | undefined = (
                  CATEGORY_STRONG as Record<string, string>
                )[cat];
                if (fixed) return fixed;
                const palette = [
                  theme.colors.infoStrong,
                  theme.colors.warningStrong,
                  theme.colors.primaryStrong,
                  theme.colors.accentStrong,
                  theme.colors.highlightStrong,
                  theme.colors.danger,
                ];
                let h = 0;
                for (let i = 0; i < cat.length; i++)
                  h = ((h * 31 + cat.charCodeAt(i)) >>> 0) % palette.length;
                return palette[h];
              };

              return (
                <View
                  style={[
                    styles.calContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: theme.radius.lg,
                    },
                  ]}
                >
                  <View style={styles.calHeaderRow}>
                    {WEEKDAY_ORDER.map((dow) => (
                      <Text
                        key={dow}
                        style={[
                          styles.calHeaderText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {DAY_LABELS[dow]}
                      </Text>
                    ))}
                  </View>

                  {Array.from({ length: totalRows }, (_, row) => {
                    const slice = cells.slice(row * 7, (row + 1) * 7);
                    const tasksInRow = new Map<
                      string,
                      { task: Task; cols: number[] }
                    >();
                    slice.forEach((day, col) => {
                      if (day == null) return;
                      const tasks = dayTasksMap.get(day) ?? [];
                      tasks.forEach((t) => {
                        if (!tasksInRow.has(t.id))
                          tasksInRow.set(t.id, { task: t, cols: [] });
                        tasksInRow.get(t.id)!.cols.push(col);
                      });
                    });

                    const laneUsed = Array.from({ length: LANES }, () => new Set<number>());
                    const bars: {
                      key: string;
                      color: string;
                      left: number;
                      width: number;
                      top: number;
                    }[] = [];
                    const overflowIds = new Set<string>();

                    Array.from(tasksInRow.values()).forEach(({ task, cols }) => {
                      const uniq = Array.from(new Set(cols)).sort((a, b) => a - b);
                      const runs: number[][] = [];
                      let run: number[] = uniq.length > 0 ? [uniq[0]] : [];
                      for (let i = 1; i < uniq.length; i++) {
                        if (uniq[i] === run[run.length - 1] + 1) {
                          run.push(uniq[i]);
                        } else {
                          if (run.length) runs.push(run);
                          run = [uniq[i]];
                        }
                      }
                      if (run.length) runs.push(run);

                      runs.forEach((r) => {
                        const span = new Set(r);
                        let lane = -1;
                        for (let l = 0; l < LANES; l++) {
                          let ok = true;
                          for (const c of span) if (laneUsed[l].has(c)) { ok = false; break; }
                          if (ok) { lane = l; break; }
                        }
                        if (lane === -1) { overflowIds.add(task.id); return; }
                        span.forEach((c) => laneUsed[lane].add(c));
                        bars.push({
                          key: `${row}-${task.id}-${r.join('-')}`,
                          color: withOpacity(taskColor(task), 0.6),
                          left: r[0] * colPct,
                          width: r.length * colPct,
                          top: 9 + lane * 7,
                        });
                      });
                    });

                    return (
                      <View key={row} style={styles.calRowWrap}>
                        <View style={styles.calRow}>
                          {slice.map((day, col) => {
                            const date =
                              day != null
                                ? new Date(
                                    monthView.monthDates[0].getFullYear(),
                                    monthView.monthDates[0].getMonth(),
                                    day,
                                  )
                                : null;
                            const isToday =
                              isCurrentMonth && day === todayDate;
                            const selected =
                              date != null &&
                              selectedDateKeys.has(dateKeyOf(date));
                            const dayTasks = day != null ? dayTasksMap.get(day) : undefined;
                            const overflow = dayTasks
                              ? dayTasks.filter((t) => overflowIds.has(t.id)).length
                              : 0;

                            return (
                              <Pressable
                                key={col}
                                disabled={day == null}
                                onPress={() =>
                                  date != null &&
                                  toggleDateKey(dateKeyOf(date))
                                }
                                style={[
                                  styles.calCell,
                                  selected && {
                                    backgroundColor: theme.colors.primarySoft,
                                    borderColor: theme.colors.primaryStrong,
                                  },
                                ]}
                              >
                                {day != null ? (
                                  <Text
                                    style={[
                                      styles.calDayNum,
                                      {
                                        color: isToday
                                          ? theme.colors.primaryStrong
                                          : theme.colors.textPrimary,
                                        fontWeight: isToday ? '800' : '600',
                                      },
                                    ]}
                                  >
                                    {day}
                                  </Text>
                                ) : null}
                                {overflow > 0 ? (
                                  <Text
                                    style={[
                                      styles.calDotMore,
                                      { color: theme.colors.textSecondary },
                                    ]}
                                  >
                                    +{overflow}
                                  </Text>
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                        {bars.length > 0 ? (
                          <View
                            style={styles.calBarsLayer}
                            pointerEvents="none"
                          >
                            {bars.map((bar) => (
                              <View
                                key={bar.key}
                                style={[
                                  styles.calBar,
                                  {
                                    left: `${bar.left}%`,
                                    width: `${bar.width}%`,
                                    top: bar.top,
                                    backgroundColor: bar.color,
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {selectedDayBlocks.flatMap(({ date, tasks, isToday }) =>
              tasks.length === 0
                ? [
                    <View key={dateKeyOf(date)} style={styles.dayBlock}>
                      <Text
                        style={[
                          styles.dayLabel,
                          { color: theme.colors.primaryStrong },
                        ]}
                      >
                        {formatDayHeader(date)}
                      </Text>
                      <EmptyLine message="Sin tareas este día" />
                    </View>,
                  ]
                : tasks.map((task) => (
                    <View
                      key={`${dateKeyOf(date)}-${task.id}`}
                      style={styles.dayTaskRow}
                    >
                      <Text
                        style={[
                          styles.dayTaskLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {DAY_SHORT_LABELS[
                          date.getDay() as DayOfWeek
                        ].toUpperCase()}{' '}
                        {date.getDate()}
                        {taskTimeOf(task)
                          ? ` · ${taskTimeOf(task)}`
                          : ` · Todo el día`}
                        {isToday ? ' · Hoy' : ''}
                      </Text>
                      <TaskRow
                        task={task}
                        assignee={getMemberById(task.assigneeId)}
                        onPressCheck={() =>
                          task.assigneeId
                            ? toggleAssigned(task.id)
                            : claimFreeTask(task.id)
                        }
                        locked={!canCheckTask(task)}
                        {...renderQuickAssignProps(task)}
                      />
                    </View>
                  )),
            )}
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
                              {...renderQuickAssignProps(task)}
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
                        {...renderQuickAssignProps(task)}
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
        visible={formVisible || !!editingTask}
        task={editingTask}
        initialDays={
          viewMode === 'dias' && !editingTask
            ? selectedWeekdays
            : undefined
        }
        initialDate={
          viewMode === 'dias' && !editingTask && selectedDateList.length > 0
            ? dateKeyOf(selectedDateList[0])
            : undefined
        }
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
  calContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  calHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calRowWrap: {
    position: 'relative',
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    margin: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calDayNum: {
    fontSize: 15,
    zIndex: 2,
  },
  calDotMore: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    zIndex: 2,
  },
  calBarsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  calBar: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    zIndex: 1,
  },
  dayTaskRow: {
    gap: 2,
    marginBottom: 2,
  },
  dayTaskLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  dayBlock: {
    gap: 6,
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginBottom: 4,
    marginLeft: 4,
  },
});