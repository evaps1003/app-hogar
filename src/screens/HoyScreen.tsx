import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SectionDivider } from '../components/SectionDivider';
import { EmptyLine } from '../components/EmptyLine';
import { TaskRow } from '../components/TaskRow';
import { MemberAvatar } from '../components/MemberAvatar';
import { DayStrip } from '../components/DayStrip';
import { useTasks } from '../data/TaskContext';
import { useHousehold } from '../data/HouseholdContext';
import { isNoticeExpired } from '../data/notices';
import {
  DAY_LABELS,
  DAY_LONG_LABELS,
  DAY_SHORT_LABELS,
  WEEKDAY_ORDER,
  formatSchedule,
  getCurrentWeekKey,
  rotatingMemberOn,
  rotatingOccursOn,
  scheduledOccursOn,
  scheduleRangeKeys,
  toDateKey,
} from '../data/schedule';
import { DayOfWeek, Task } from '../data/types';
import { RootTabParamList } from '../navigation/types';
import { useTheme } from '../theme';

type PersonalView = 'hoy' | 'semana' | 'mes';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatMonthDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const dow = DAY_SHORT_LABELS[date.getDay() as DayOfWeek];
  return `${dow} ${day} de ${month}`;
}

export function HoyScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, 'Hoy'>>();
  const {
    dueOn,
    pendingAssigned,
    pendingFree,
    doneFree,
    thisWeek,
    toggleAssigned,
    claimFreeTask,
    canCheckTask,
    reopen,
    swapRequests,
    assumeTask,
    tasks,
  } = useTasks();
  const { getMemberById, activeMember, notices } = useHousehold();
  const { theme } = useTheme();

  const activeId = activeMember?.id;
  const todayDay = new Date().getDay() as DayOfWeek;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [stripKey, setStripKey] = useState(0);
  const [view, setView] = useState<PersonalView>('hoy');
  const [swapExpanded, setSwapExpanded] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const noticesActive = useMemo(
    () => notices.filter((notice) => !isNoticeExpired(notice)),
    [notices],
  );

  const renderAvisos = () => {
    if (noticesActive.length === 0) return null;
    return (
      <View style={styles.avisosStack}>
        {noticesActive.map((notice) => {
          const author = getMemberById(notice.createdBy);
          return (
            <View
              key={notice.id}
              style={[
                styles.avisoPill,
                { backgroundColor: theme.colors.highlightSoft },
              ]}
            >
              {author ? (
                <MemberAvatar member={author} size={24} />
              ) : (
                <View
                  style={[
                    styles.avisoAuthor,
                    { backgroundColor: theme.colors.highlightStrong },
                  ]}
                >
                  <Ionicons name="home" size={12} color="#FFFFFF" />
                </View>
              )}
              <Text style={[styles.avisoText, { color: theme.colors.textPrimary }]}>
                <Text
                  style={[
                    styles.avisoLabel,
                    { color: theme.colors.highlightStrong },
                  ]}
                >
                  📌 Aviso:{' '}
                </Text>
                {notice.text}
              </Text>
              <Ionicons
                name="pin"
                size={14}
                color={theme.colors.highlightStrong}
              />
            </View>
          );
        })}
      </View>
    );
  };

  const resetToToday = () => {
    setSelectedDay(new Date().getDay() as DayOfWeek);
    setStripKey((k) => k + 1);
    setView('hoy');
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', resetToToday);
    return unsubscribe;
  }, [navigation]);

  const dayTasks = dueOn(selectedDay);
  const isToday = selectedDay === todayDay;

  const userTasks = useMemo(
    () =>
      pendingAssigned.filter((t) => t.assigneeId === activeId && !t.completed),
    [pendingAssigned, activeId],
  );

  const personalBase = useMemo(
    () => tasks.filter((t) => t.assigneeId !== null && !t.completed),
    [tasks],
  );

  const isYoursOn = (t: Task, date: Date): boolean =>
    t.rotacion
      ? rotatingMemberOn(t.rotacion, date) === activeId
      : t.assigneeId === activeId;

  const occursOn = (t: Task, date: Date): boolean => {
    const s = t.schedule;
    if (!s) return date.toDateString() === new Date().toDateString();
    if (s.type === 'flexible') return false;
    if (t.rotacion) return rotatingOccursOn(s, t.rotacion, date);
    if (s.type === 'once') {
      const key = toDateKey(date);
      if (key < s.dueDate) return false;
      if (s.endDate && key > s.endDate) return false;
      return true;
    }
    return scheduledOccursOn(s, date);
  };

  const matchesOn = (t: Task, date: Date): boolean =>
    isYoursOn(t, date) && occursOn(t, date);

  const weekData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + weekOffset * 7);

    const occurrences = WEEKDAY_ORDER.map((dow, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const tasks = personalBase.filter((t) => matchesOn(t, date));

      return { dow, date, tasks };
    });

    const anchorIndex = new Map<string, number>();
    occurrences.forEach((occ, i) => {
      occ.tasks.forEach((t) => {
        const range = t.schedule ? scheduleRangeKeys(t.schedule) : null;
        if (range && !anchorIndex.has(t.id)) anchorIndex.set(t.id, i);
      });
    });

    return occurrences.map((occ, i) => ({
      ...occ,
      tasks: occ.tasks.filter((t) => {
        const range = t.schedule ? scheduleRangeKeys(t.schedule) : null;
        if (!range) return true;
        return anchorIndex.get(t.id) === i;
      }),
    }));
  }, [personalBase, weekOffset]);

  const monthView = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay() as DayOfWeek;
    const startOffset = (firstDow + 6) % 7;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const todayDate = now.getDate();
    const todayMonth = now.getMonth();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length < totalCells) cells.push(null);

    const dayTasksMap = new Map<number, Task[]>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const matched = personalBase.filter((t) => matchesOn(t, date));
      if (matched.length > 0) dayTasksMap.set(d, matched);
    }

    const rangeTaskIds = new Set<string>();
    dayTasksMap.forEach((tasks) => {
      tasks.forEach((t) => {
        if (
          !rangeTaskIds.has(t.id) &&
          t.schedule &&
          scheduleRangeKeys(t.schedule)
        ) {
          rangeTaskIds.add(t.id);
        }
      });
    });

    return { cells, dayTasksMap, todayDate, todayMonth, rangeTaskIds };
  }, [personalBase]);

  const renderPills = () => (
    <View style={styles.pillRow}>
      {([
        { key: 'hoy' as const, label: 'Hoy' },
        { key: 'semana' as const, label: 'Semana' },
        { key: 'mes' as const, label: 'Mes' },
      ]).map((option) => {
        const selected = view === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => setView(option.key)}
            style={[
              styles.pill,
              {
                backgroundColor: selected
                  ? theme.colors.primaryStrong
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                {
                  color: selected ? '#FFFFFF' : theme.colors.textSecondary,
                  fontWeight: selected ? '800' : '600',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSwap = () =>
    swapRequests.length > 0 ? (
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
      </SectionCard>
    ) : null;

  const renderBolsa = () => (
    <SectionCard
      title="Bolsa común"
      subtitle="Libres para quien las tome"
      style={{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 20,
        shadowOpacity: 0,
        elevation: 0,
      }}
    >
      {pendingFree.length === 0 && doneFree.length === 0 ? (
        <EmptyLine message="La bolsa está vacía. ¡Bien!" />
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
    </SectionCard>
  );

  const renderHoy = () => (
    <>
      {renderAvisos()}

      <DayStrip
        key={stripKey}
        selected={selectedDay}
        onSelect={setSelectedDay}
      />

      {renderSwap()}

      <SectionCard
        title="Toca hoy"
        subtitle={
          isToday
            ? 'Tus tareas asignadas para hoy'
            : `Tus tareas para ${DAY_LONG_LABELS[selectedDay].toLowerCase()}`
        }
      >
        {dayTasks.length === 0 ? (
          <EmptyLine message="Sin tareas para este día ✨" />
        ) : (
          dayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              assignee={getMemberById(task.assigneeId)}
              onPressCheck={() => toggleAssigned(task.id)}
              locked={!canCheckTask(task)}
            />
          ))
        )}
        {isToday && thisWeek.length > 0 ? (
          <>
            <SectionDivider
              label={dayTasks.length > 0 ? 'Flexibles' : 'Flexibles esta semana'}
            />
            {thisWeek.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                assignee={getMemberById(task.assigneeId)}
                onPressCheck={() => toggleAssigned(task.id)}
                locked={!canCheckTask(task)}
              />
            ))}
          </>
        ) : null}
      </SectionCard>

      {renderBolsa()}
    </>
  );

  const renderSemana = () => {
    const daysWithTasks = weekData.filter((w) => w.tasks.length > 0);
    const monday = weekData[0]?.date;
    const sunday = weekData[6]?.date;
    const rangeLabel =
      monday && sunday
        ? `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} - ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]}`
        : undefined;

    const viewedWeekKey = weekData[0]?.date
      ? getCurrentWeekKey(weekData[0].date)
      : undefined;
    const flexiblesOfWeek = viewedWeekKey
      ? userTasks.filter(
          (t) =>
            t.schedule?.type === 'flexible' &&
            t.schedule.weekKey === viewedWeekKey,
        )
      : [];

    return (
      <>
        <View
          style={[
            styles.weekNav,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            style={({ pressed }) => [
              styles.weekNavArrow,
              pressed && { opacity: 0.5 },
            ]}
            accessibilityLabel="Semana anterior"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.primaryStrong}
            />
          </Pressable>
          <View style={styles.weekNavCenter}>
            <Text
              style={[
                styles.weekNavTitle,
                { color: theme.colors.textPrimary },
              ]}
            >
              {weekOffset === 0 ? 'Semana actual' : 'Semana'}
            </Text>
            <Text
              style={[
                styles.weekNavSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {rangeLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => setWeekOffset((o) => o + 1)}
            style={({ pressed }) => [
              styles.weekNavArrow,
              pressed && { opacity: 0.5 },
            ]}
            accessibilityLabel="Semana siguiente"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={theme.colors.primaryStrong}
            />
          </Pressable>
        </View>

        <SectionCard
          title={daysWithTasks.length === 0 ? 'Semana actual' : 'Tus tareas de la semana'}
          subtitle={undefined}
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 20,
            shadowOpacity: 0,
            elevation: 0,
          }}
        >
          {daysWithTasks.length === 0 ? (
            <EmptyLine message="Sin tareas esta semana ✨" />
          ) : (
            daysWithTasks.map(({ dow, date, tasks: dayTasks }) => {
              const isCurrentDay = dow === todayDay && weekOffset === 0;
              return (
                <View key={dow} style={styles.monthDayBlock}>
                  <Text
                    style={[
                      styles.monthDayLabel,
                      { color: theme.colors.primaryStrong },
                    ]}
                  >
                    {formatMonthDate(date)}
                    {isCurrentDay ? ' · Hoy' : ''}
                  </Text>
                  {dayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
assignee={getMemberById(task.assigneeId)}
                onPressCheck={() => toggleAssigned(task.id)}
                locked={!canCheckTask(task)}
              />
                  ))}
                </View>
              );
            })
          )}
        </SectionCard>

        {flexiblesOfWeek.length > 0 ? (
          <SectionCard
            title="Flexibles de la semana"
            subtitle="Complétalas cuando puedas"
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 20,
              shadowOpacity: 0,
              elevation: 0,
            }}
          >
            {flexiblesOfWeek.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                assignee={getMemberById(task.assigneeId)}
                onPressCheck={() => toggleAssigned(task.id)}
                locked={!canCheckTask(task)}
              />
            ))}
          </SectionCard>
        ) : null}
      </>
    );
  };

  const renderMes = () => {
    const { cells, dayTasksMap, todayDate, todayMonth, rangeTaskIds } = monthView;
    const now = new Date();
    const isCurrentMonth = now.getMonth() === todayMonth;

    const CATEGORY_STRONG: Record<string, string> = {
      limpieza: theme.colors.primaryStrong,
      cocina: theme.colors.highlightStrong,
      otros: theme.colors.accentStrong,
    };
    const EXTRA_PALETTE = [
      theme.colors.infoStrong,
      theme.colors.warningStrong,
      theme.colors.primary,
      theme.colors.accent,
      theme.colors.highlight,
      theme.colors.danger,
    ];

    const taskColor = (t: Task) => {
      const cat = t.category ?? 'otros';
      const fixed = CATEGORY_STRONG[cat];
      if (fixed) return fixed;
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = (hash * 31 + cat.charCodeAt(i)) >>> 0;
      }
      return EXTRA_PALETTE[hash % EXTRA_PALETTE.length];
    };

    const withOpacity = (hex: string, alpha: number) => {
      const a = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');
      return `${hex}${a}`;
    };

    const isRangeTask = (t: Task) =>
      !!t.schedule && scheduleRangeKeys(t.schedule) !== null;

    const seen = new Set<string>();
    const legendTasks: Task[] = [];
    Array.from(dayTasksMap.values()).forEach((tasks) => {
      tasks.forEach((t) => {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          legendTasks.push(t);
        }
      });
    });

    const monthLabel = MONTH_NAMES[now.getMonth()];

    let legendList: Task[] = legendTasks;
    let legendTitle = 'Tareas del mes';
    let legendSubtitle = `${legendTasks.length} tarea${legendTasks.length !== 1 ? 's' : ''} pendiente${legendTasks.length !== 1 ? 's' : ''}`;

    if (selectedTaskId) {
      const picked = legendTasks.find((t) => t.id === selectedTaskId);
      legendList = picked ? [picked] : [];
      if (picked) {
        legendTitle = 'Tarea seleccionada';
        legendSubtitle = formatSchedule(picked.schedule) ?? 'Pendiente';
      } else {
        legendSubtitle = '';
      }
    } else if (selectedMonthDay != null) {
      legendList = dayTasksMap.get(selectedMonthDay) ?? [];
      const n = legendList.length;
      legendTitle = `${n} tarea${n !== 1 ? 's' : ''} el día ${selectedMonthDay}`;
      legendSubtitle = `${monthLabel} de ${now.getFullYear()}`;
    }

    return (
      <>
        {renderSwap()}

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
            {WEEKDAY_ORDER.map((d) => (
              <Text
                key={d}
                style={[
                  styles.calHeaderText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {DAY_LABELS[d]}
              </Text>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, row) => {
            const slice = cells.slice(row * 7, row * 7 + 7);
            if (slice.every((d) => d === null)) return null;

            const tasksInRow = new Map<string, { task: Task; cols: number[] }>();
            slice.forEach((day, col) => {
              if (day === null) return;
              const tasks = dayTasksMap.get(day) ?? [];
              tasks.forEach((t) => {
                if (!rangeTaskIds.has(t.id)) return;
                if (!tasksInRow.has(t.id)) tasksInRow.set(t.id, { task: t, cols: [] });
                tasksInRow.get(t.id)!.cols.push(col);
              });
            });

            const LANES = 4;
            const laneUsed = Array.from({ length: LANES }, () => new Set<number>());
            const colPct = 100 / 7;
            const bars: {
              key: string;
              taskId: string;
              color: string;
              left: number;
              width: number;
              top: number;
            }[] = [];
            const overflowTaskIds = new Set<string>();

            Array.from(tasksInRow.values()).forEach(({ task, cols }) => {
              const sorted = Array.from(new Set(cols)).sort((a, b) => a - b);
              const runs: number[][] = [];
              let run: number[] = sorted.length > 0 ? [sorted[0]] : [];
              for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === run[run.length - 1] + 1) {
                  run.push(sorted[i]);
                } else {
                  runs.push(run);
                  run = [sorted[i]];
                }
              }
              if (run.length > 0) runs.push(run);

              runs.forEach((r) => {
                const span = new Set(r);
                let lane = -1;
                for (let l = 0; l < LANES; l++) {
                  let conflict = false;
                  for (const c of span) {
                    if (laneUsed[l].has(c)) {
                      conflict = true;
                      break;
                    }
                  }
                  if (!conflict) {
                    lane = l;
                    break;
                  }
                }
                if (lane === -1) {
                  overflowTaskIds.add(task.id);
                  return;
                }
                span.forEach((c) => laneUsed[lane].add(c));
                bars.push({
                  key: `${row}-${task.id}-${r.join('-')}`,
                  taskId: task.id,
                  color: withOpacity(taskColor(task), 0.6),
                  left: r[0] * colPct,
                  width: r.length * colPct,
                  top: 30 + lane * 7,
                });
              });
            });

            return (
              <View key={row} style={styles.calRowWrap}>
                <View style={styles.calRow}>
                  {slice.map((day, col) => {
                    const isToday = isCurrentMonth && day === now.getDate();
                    const isSelected =
                      day !== null && selectedMonthDay === day;
                    const dayTasks =
                      day === null ? undefined : dayTasksMap.get(day);
                    const dots = dayTasks
                      ? dayTasks.filter((t) => !rangeTaskIds.has(t.id))
                      : [];
                    const shownDots = dots.slice(0, 3);
                    const extraDots = dots.length > 3 ? dots.length - 3 : 0;
                    return (
                      <Pressable
                        key={col}
                        disabled={day === null}
                        onPress={() => {
                          if (day === null) return;
                          setSelectedTaskId(null);
                          setSelectedMonthDay((prev) =>
                            prev === day ? null : day,
                          );
                        }}
                        style={[
                          styles.calCell,
                          isSelected && {
                            backgroundColor: theme.colors.primarySoft,
                            borderRadius: 10,
                          },
                        ]}
                      >
                        {day !== null ? (
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
                        {shownDots.length > 0 ? (
                          <View style={styles.calDotsRow}>
                            {shownDots.map((t) => (
                              <View
                                key={t.id}
                                style={[
                                  styles.calDot,
                                  {
                                    backgroundColor: withOpacity(
                                      taskColor(t),
                                      0.85,
                                    ),
                                  },
                                ]}
                              />
                            ))}
                            {extraDots > 0 ? (
                              <Text
                                style={[
                                  styles.calDotMore,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                +{extraDots}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {bars.length > 0 ? (
                  <View style={styles.calBarsLayer} pointerEvents="box-none">
                    {bars.map((bar) => (
                      <Pressable
                        key={bar.key}
                        hitSlop={8}
                        onPress={() => {
                          setSelectedMonthDay(null);
                          setSelectedTaskId((prev) =>
                            prev === bar.taskId ? null : bar.taskId,
                          );
                        }}
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

        {legendTasks.length > 0 ? (
          <SectionCard
            title={legendTitle}
            subtitle={legendSubtitle || undefined}
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 20,
              shadowOpacity: 0,
              elevation: 0,
            }}
          >
            {legendList.length > 0 ? (
              legendList.map((task) => {
                const color = withOpacity(taskColor(task), 0.4);
                const range = isRangeTask(task);
                return (
                  <View key={task.id} style={styles.legendRow}>
                    <View
                      style={
                        range
                          ? [styles.legendBarHighlight, { backgroundColor: color }]
                          : [styles.legendDotHighlight, { backgroundColor: color }]
                      }
                    />
                    <View style={styles.legendBody}>
                      <TaskRow
                        task={task}
                        onPressCheck={() => toggleAssigned(task.id)}
                        locked={!canCheckTask(task)}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <EmptyLine message="Sin tareas este día ✨" />
            )}
          </SectionCard>
        ) : (
          <EmptyLine message="Sin tareas este mes ✨" />
        )}
      </>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Mis Tareas"
        subtitle="Tu parte del día resumida"
        onPressTitle={resetToToday}
      />

      {renderPills()}

      {view === 'hoy'
        ? renderHoy()
        : view === 'semana'
          ? renderSemana()
          : renderMes()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avisosStack: {
    gap: 8,
    marginBottom: 14,
  },
  avisoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  avisoAuthor: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  avisoLabel: {
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 15,
  },
  monthDayBlock: {
    marginBottom: 10,
  },
  monthDayLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 6,
    marginLeft: 4,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  weekNavArrow: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekNavTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekNavSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
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
  },
  calDayNum: {
    fontSize: 15,
    zIndex: 2,
  },
  calDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 4,
    zIndex: 2,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendBody: {
    flex: 1,
  },
  legendDotHighlight: {
    width: 22,
    height: 12,
    borderRadius: 6,
  },
  legendBarHighlight: {
    width: 46,
    height: 8,
    borderRadius: 4,
  },
});