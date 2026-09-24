import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';
import { useTasks } from '../data/TaskContext';
import { useHousehold } from '../data/HouseholdContext';
import {
  DAY_LABELS,
  DAY_LONG_LABELS,
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_ORDER,
  addDays,
  dateInWeekMonday,
  fromDateKey,
  scheduledOccursOn,
  startOfWeek,
  toDateKey,
} from '../data/schedule';
import {
  DayOfWeek,
  RotatingTurn,
  ScheduledSchedule,
  Task,
  TaskCategory,
  TaskSchedule,
} from '../data/types';
import { buildCategoryOptions } from '../data/categories';
import { Theme, useTheme } from '../theme';

const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_OPTIONS = [
  { dias: 7, label: 'Semanal' },
  { dias: 15, label: 'Quincenal' },
  { dias: 30, label: 'Mensual' },
];

const TIME_PRESETS = [
  { label: 'Mañana', value: '09:00' },
  { label: 'Mediodía', value: '13:00' },
  { label: 'Tarde', value: '17:00' },
  { label: 'Noche', value: '20:00' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const STEPS = [
  { n: 1, label: 'Datos' },
  { n: 2, label: 'Quién' },
  { n: 3, label: 'Cuándo' },
];

type Temporality = 'puntual' | 'periodica';

interface NewTaskFormProps {
  visible: boolean;
  onClose: () => void;
  initialDay?: DayOfWeek;
  initialDays?: DayOfWeek[];
  initialDate?: string;
  task?: Task | null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(value: string): { h: number; m: number } {
  const [hh, mm] = value.split(':').map(Number);
  return {
    h: Number.isFinite(hh) && hh >= 0 && hh <= 23 ? hh : 10,
    m: Number.isFinite(mm) && mm >= 0 && mm <= 59 ? mm : 0,
  };
}

function formatLongDate(key: string): string {
  const d = fromDateKey(key);
  return `${DAY_LONG_LABELS[d.getDay() as DayOfWeek]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function formatRangeLong(startKey: string, endKey: string): string {
  const s = fromDateKey(startKey);
  const e = fromDateKey(endKey);
  return `${DAY_LONG_LABELS[s.getDay() as DayOfWeek]} ${s.getDate()} – ${DAY_LONG_LABELS[e.getDay() as DayOfWeek]} ${e.getDate()} de ${MONTH_NAMES[e.getMonth()]}`;
}

function DurationToggle({
  mode,
  onChange,
  theme,
  labels,
}: {
  mode: boolean;
  onChange: (next: boolean) => void;
  theme: Theme;
  labels: [string, string];
}) {
  return (
    <View style={styles.durationWrap}>
      <Pressable
        onPress={() => onChange(false)}
        style={[
          styles.durationOption,
          {
            backgroundColor: !mode
              ? theme.colors.primaryStrong
              : theme.colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={[
            styles.durationText,
            {
              color: !mode ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: !mode ? '800' : '600',
            },
          ]}
        >
          {labels[0]}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(true)}
        style={[
          styles.durationOption,
          {
            backgroundColor: mode
              ? theme.colors.primaryStrong
              : theme.colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={[
            styles.durationText,
            {
              color: mode ? '#FFFFFF' : theme.colors.textSecondary,
              fontWeight: mode ? '800' : '600',
            },
          ]}
        >
          {labels[1]}
        </Text>
      </Pressable>
    </View>
  );
}

function InlineCalendar({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (key: string) => void;
  theme: Theme;
}) {
  const [cursor, setCursor] = useState<Date>(() =>
    value ? fromDateKey(value) : new Date(),
  );

  useEffect(() => {
    if (value) setCursor(fromDateKey(value));
  }, [value]);

  const calYear = cursor.getFullYear();
  const calMonth = cursor.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay() as DayOfWeek;
  const startOffset = (firstDow + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < totalCells) cells.push(null);
  const todayKey = toDateKey(new Date());

  return (
    <View style={styles.calBox}>
      <View style={styles.calNav}>
        <Pressable hitSlop={8} onPress={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.primaryStrong} />
        </Pressable>
        <Text style={[styles.calNavTitle, { color: theme.colors.textPrimary }]}>
          {MONTH_NAMES[calMonth]} {calYear}
        </Text>
        <Pressable hitSlop={8} onPress={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primaryStrong} />
        </Pressable>
      </View>
      <View style={styles.calHeaderRow}>
        {WEEKDAY_ORDER.map((dow) => (
          <Text key={dow} style={[styles.calHeaderText, { color: theme.colors.textSecondary }]}>
            {DAY_LABELS[dow]}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => {
        const slice = cells.slice(row * 7, (row + 1) * 7);
        return (
          <View key={row} style={styles.calRow}>
            {slice.map((day, col) => {
              if (day == null) return <View key={col} style={styles.calCell} />;
              const key = toDateKey(new Date(calYear, calMonth, day));
              const isSelected = value === key;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={col}
                  onPress={() => onChange(key)}
                  style={[
                    styles.calCell,
                    isSelected && { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayNum,
                      {
                        color: isToday
                          ? theme.colors.primaryStrong
                          : theme.colors.textPrimary,
                        fontWeight: isToday ? '800' : '500',
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <View style={styles.calQuick}>
        <Pressable
          onPress={() => {
            onChange(toDateKey(new Date()));
            setCursor(new Date());
          }}
          style={[styles.calQuickPill, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.calQuickText, { color: theme.colors.primaryStrong }]}>Hoy</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const t = addDays(new Date(), 1);
            onChange(toDateKey(t));
            setCursor(t);
          }}
          style={[styles.calQuickPill, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.calQuickText, { color: theme.colors.primaryStrong }]}>Mañana</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function NewTaskForm({
  visible,
  onClose,
  initialDay,
  initialDays,
  initialDate,
  task,
}: NewTaskFormProps) {
  const { theme } = useTheme();
  const { members, categories: customCategories } = useHousehold();
  const { addTask, updateTask, deleteTask } = useTasks();
  const categoryOptions = buildCategoryOptions(customCategories);

  const cardStyle = [styles.card, { backgroundColor: theme.colors.surfaceVariant }];

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('otros');

  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [turnMembers, setTurnMembers] = useState<string[]>([]);

  const [temporality, setTemporality] = useState<Temporality>('puntual');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(7);
  const [customDias, setCustomDias] = useState('');
  const [time, setTime] = useState('');

  const [calOpen, setCalOpen] = useState(false);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [rangeMode, setRangeMode] = useState(false);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setCalOpen(false);
    setStartCalOpen(false);
    setEndCalOpen(false);
    setTimeOpen(false);

    if (!task) {
      setTitle('');
      setCategory('otros');
      setRotating(false);
      setTurnMembers([]);
      const prefillDate = initialDate ?? toDateKey(new Date());
      const prefillDays =
        initialDays && initialDays.length > 0
          ? initialDays
          : initialDay
            ? [initialDay]
            : initialDate
              ? [fromDateKey(initialDate).getDay() as DayOfWeek]
              : [];
      setTemporality('puntual');
      setDueDate(prefillDate);
      setStartDate(prefillDate);
      setDays(prefillDays);
      setRepeatIntervalDays(7);
      setCustomDias('');
      setTime('');
      setRangeMode(false);
      setEndDate('');
      setAssigneeId(members[0]?.id ?? null);
      return;
    }

    setTitle(task.title);
    setCategory(task.category ?? 'otros');

    const rot = task.rotacion;
    const hasRotacion = !!rot;
    setRotating(hasRotacion);
    setTurnMembers(rot?.miembrosTurno ?? []);

    const sched = task.schedule;
    const todayKey = toDateKey(new Date());

    if (sched?.type === 'once') {
      setTemporality('puntual');
      setDueDate(sched.dueDate);
      setStartDate(sched.dueDate);
      setDays([]);
      setRepeatIntervalDays(7);
      setCustomDias('');
      setTime(sched.time ?? '');
      setRangeMode(!!sched.endDate && sched.endDate !== sched.dueDate);
      setEndDate(sched.endDate ?? '');
    } else if (sched?.type === 'scheduled') {
      setTemporality('periodica');
      const interval =
        sched.repeatIntervalDays && sched.repeatIntervalDays > 0
          ? sched.repeatIntervalDays
          : 7;
      const start = sched.startDate ?? todayKey;
      setDueDate(start);
      setStartDate(start);
      setDays(sched.days.length > 0 ? sched.days : []);
      setRepeatIntervalDays(interval);
      setCustomDias('');
      setTime(sched.time ?? '');
      setRangeMode(!!sched.endDate);
      setEndDate(sched.endDate ?? '');
    } else if (sched?.type === 'flexible') {
      setTemporality('periodica');
      setDueDate(todayKey);
      setStartDate(todayKey);
      setDays([new Date().getDay() as DayOfWeek]);
      setRepeatIntervalDays(7);
      setCustomDias('');
      setTime('');
      setRangeMode(false);
      setEndDate('');
    } else {
      setTemporality('puntual');
      setDueDate(todayKey);
      setStartDate(todayKey);
      setDays([]);
      setRepeatIntervalDays(7);
      setCustomDias('');
      setTime('');
      setRangeMode(false);
      setEndDate('');
    }

    setAssigneeId(
      hasRotacion
        ? rot!.miembrosTurno[rot!.indiceTurnoActual] ?? null
        : task.assigneeId ?? null,
    );
  }, [visible, members, initialDay, initialDays, initialDate, task]);

  const step1Ready = title.trim().length > 0;
  const step2Ready = !rotating || turnMembers.length > 0;
  const step3Ready =
    temporality === 'puntual'
      ? dueDate.length > 0 &&
        (!rangeMode || (endDate.length > 0 && endDate >= dueDate))
      : rangeMode
        ? startDate.length > 0 && endDate.length > 0 && endDate >= startDate
        : startDate.length > 0 && days.length > 0;
  const canSubmit = step1Ready && step2Ready && step3Ready;
  const canAdvance = step === 1 ? step1Ready : step === 2 ? step2Ready : step3Ready;

  const goNext = () => {
    if (!canAdvance) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const toggleRotating = () => {
    setRotating((prev) => {
      const next = !prev;
      if (next && turnMembers.length === 0) {
        const first = assigneeId ?? members[0]?.id ?? null;
        if (first) setTurnMembers([first]);
      }
      return next;
    });
  };

  const toggleTurnMember = (id: string) => {
    setTurnMembers((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  const selectTemporality = (next: Temporality) => {
    if (next === temporality) return;
    setTemporality(next);
    setCalOpen(false);
    setStartCalOpen(false);
    setEndCalOpen(false);
    setTimeOpen(false);
    if (next === 'periodica' && days.length === 0 && startDate && !rangeMode) {
      setDays([fromDateKey(startDate).getDay() as DayOfWeek]);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleStartDateChange = (key: string) => {
    setStartDate(key);
    setDueDate(key);
    if (days.length === 0 && !rangeMode) {
      setDays([fromDateKey(key).getDay() as DayOfWeek]);
    }
  };

  const pickFrequency = (dias: number) => {
    setRepeatIntervalDays(dias);
    setCustomDias('');
  };

  const handleCustomDias = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setCustomDias(digits);
    const value = Number(digits);
    if (value > 0) setRepeatIntervalDays(value);
  };

  const stepDays = (delta: number) => {
    const next = Math.min(365, Math.max(1, repeatIntervalDays + delta));
    setRepeatIntervalDays(next);
    setCustomDias(String(next));
  };

  const setHour = (h: number) => {
    const { m } = parseTime(time);
    setTime(`${pad(h)}:${pad(m)}`);
  };

  const setMinute = (m: number) => {
    const { h } = parseTime(time);
    setTime(`${pad(h)}:${pad(m)}`);
  };

  const buildSchedule = (): TaskSchedule | undefined => {
    if (temporality === 'puntual') {
      if (!dueDate) return undefined;
      const isRange = rangeMode && !!endDate && endDate > dueDate;
      return {
        type: 'once',
        dueDate,
        time: time.trim() || null,
        endDate: isRange ? endDate : undefined,
      };
    }
    if (!startDate) return undefined;
    if (rangeMode) {
      if (!endDate || endDate < startDate) return undefined;
      return {
        type: 'scheduled',
        days: [],
        time: time.trim() || null,
        repeatWeekly: false,
        repeatIntervalDays,
        startDate,
        endDate,
      };
    }
    if (days.length === 0) return undefined;
    return {
      type: 'scheduled',
      days,
      time: time.trim() || null,
      repeatWeekly: false,
      repeatIntervalDays,
      startDate,
    };
  };

  const buildRotacion = (): RotatingTurn | undefined => {
    if (!rotating || turnMembers.length === 0) return undefined;
    const now = Date.now();
    const base = task?.rotacion;
    const indice = base?.indiceTurnoActual ?? 0;
    const enMiembros =
      indice < turnMembers.length ? indice : 0;
    const proxima = base?.proximaRotacion ?? now + repeatIntervalDays * DAY_MS;
    return {
      esRotativa: true,
      miembrosTurno: turnMembers,
      indiceTurnoActual: enMiembros,
      frecuenciaRotacion: repeatIntervalDays,
      fechaInicioCiclo: base?.fechaInicioCiclo ?? now,
      proximaRotacion: proxima,
    };
  };

  const wheelMembers = [
    ...turnMembers.map((id) => members.find((m) => m.id === id)),
    ...members.filter((m) => !turnMembers.includes(m.id)),
  ].filter((member) => member !== undefined);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const rotacion = buildRotacion();
    const data = {
      title: title.trim(),
      assigneeId: rotacion
        ? rotacion.miembrosTurno[rotacion.indiceTurnoActual] ?? null
        : assigneeId,
      schedule: buildSchedule(),
      rotacion,
      category,
    };
    if (task) {
      updateTask(task.id, data);
    } else {
      addTask(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    setConfirmingDelete(true);
  };

  const confirmDelete = () => {
    if (!task) return;
    setConfirmingDelete(false);
    deleteTask(task.id);
    onClose();
  };

  const startMonday = startDate
    ? startOfWeek(fromDateKey(startDate))
    : startOfWeek(new Date());
  const contextWeek = WEEKDAY_ORDER.map((dow) => {
    const date = dateInWeekMonday(startMonday, dow);
    return { dow, date, label: `${DAY_LABELS[dow]} ${date.getDate()}` };
  });

  const nextOccurrences = useMemo(() => {
    if (temporality !== 'periodica' || !startDate || rangeMode || days.length === 0) return [];
    const sched: ScheduledSchedule = {
      type: 'scheduled',
      days,
      time: time || null,
      repeatWeekly: false,
      repeatIntervalDays,
      startDate,
    };
    const start = fromDateKey(startDate);
    const horizon = addDays(start, repeatIntervalDays * 4 + 14);
    const found: Date[] = [];
    let cursor = start;
    while (found.length < 4 && cursor.getTime() <= horizon.getTime()) {
      if (scheduledOccursOn(sched, cursor)) found.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return found;
  }, [temporality, startDate, days, repeatIntervalDays, time, rangeMode]);

  const nextRangeStarts = useMemo(() => {
    if (temporality !== 'periodica' || !startDate || !rangeMode) return [];
    const start = fromDateKey(startDate);
    const horizon = addDays(start, repeatIntervalDays * 4);
    const found: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const cycle = addDays(start, i * repeatIntervalDays);
      if (cycle.getTime() > horizon.getTime()) break;
      found.push(cycle);
    }
    return found;
  }, [temporality, startDate, rangeMode, repeatIntervalDays]);

  const renderSteps = () => (
    <View style={styles.stepsRow}>
      {STEPS.map((s, idx) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <React.Fragment key={s.n}>
            {idx > 0 ? (
              <View
                style={[
                  styles.stepConnector,
                  {
                    backgroundColor:
                      active || done
                        ? theme.colors.primaryStrong
                        : theme.colors.divider,
                  },
                ]}
              />
            ) : null}
            <Pressable
              onPress={() => done && setStep(s.n)}
              style={[
                styles.stepPill,
                {
                  backgroundColor: active
                    ? theme.colors.primaryStrong
                    : done
                      ? theme.colors.primarySoft
                      : theme.colors.surfaceVariant,
                },
              ]}
            >
              {done ? (
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={theme.colors.primaryStrong}
                />
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    { color: active ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {s.n}
                </Text>
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.stepLabelText,
                  { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <>
      <View style={cardStyle}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Título de la tarea
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej.: Regar las plantas"
          placeholderTextColor={theme.colors.tabInactive}
          autoFocus
          returnKeyType="done"
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.md,
            },
          ]}
        />
      </View>

      <View style={cardStyle}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Categoría
        </Text>
        <View style={styles.categoryRow}>
          {categoryOptions.map((cat) => {
            const selected = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={15}
                  color={selected ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                      fontWeight: selected ? '800' : '600',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={cardStyle}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Asignar a
        </Text>
        <View style={styles.membersRow}>
          <Pressable
            onPress={() => setAssigneeId(null)}
            style={[
              styles.memberChip,
              {
                backgroundColor:
                  !rotating && assigneeId === null
                    ? theme.colors.primaryStrong
                    : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Ionicons
              name="bag-handle-outline"
              size={14}
              color={
                !rotating && assigneeId === null
                  ? '#FFFFFF'
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.memberChipText,
                {
                  color:
                    !rotating && assigneeId === null
                      ? '#FFFFFF'
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Bolsa común
            </Text>
          </Pressable>
          {members.map((member) => {
            const selected = !rotating && assigneeId === member.id;
            return (
              <Pressable
                key={member.id}
                onPress={() => setAssigneeId(member.id)}
                style={[
                  styles.memberChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.memberChipText,
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
        </View>
      </View>

      <Pressable
        onPress={toggleRotating}
        style={[
          styles.toggleRow,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Ionicons
          name="repeat"
          size={18}
          color={
            rotating ? theme.colors.primaryStrong : theme.colors.tabInactive
          }
        />
        <Text style={[styles.toggleText, { color: theme.colors.textPrimary }]}>
          Tarea rotativa (avanzar turno automáticamente al completarse)
        </Text>
        <Ionicons
          name={rotating ? 'checkbox' : 'square-outline'}
          size={20}
          color={
            rotating ? theme.colors.primaryStrong : theme.colors.tabInactive
          }
        />
      </Pressable>

      {rotating ? (
        <>
          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Rueda de turnos
            </Text>
            <View style={styles.membersRow}>
              {wheelMembers.map((member) => {
                const order = turnMembers.indexOf(member.id);
                const selected = order !== -1;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => toggleTurnMember(member.id)}
                    style={[
                      styles.memberChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryStrong
                          : theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        {
                          color: selected
                            ? '#FFFFFF'
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {selected ? `${order + 1}. ${member.name}` : member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              El turno 1 empieza como responsable; al completarse, rota
              automáticamente al siguiente miembro.
            </Text>
          </View>
        </>
      ) : null}

      {!rotating && assigneeId === null ? (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Nadie lo reserva: irá a la Bolsa común para que quien pueda la tome y
          se lleve su sello de mérito.
        </Text>
      ) : null}
    </>
  );

  const renderTimeField = () => (
    <Pressable
      onPress={() => setTimeOpen((v) => !v)}
      style={[styles.timeField, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
      <Text
        style={[
          styles.timeFieldText,
          { color: time ? theme.colors.textPrimary : theme.colors.textSecondary },
        ]}
      >
        {time ? `A las ${time}` : 'Sin hora · todo el día'}
      </Text>
      <Ionicons
        name={timeOpen ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );

  const renderTimePanel = () => {
    const { h, m } = parseTime(time);
    return (
      <View
        style={[styles.timeEditor, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <View style={styles.presetRow}>
          {TIME_PRESETS.map((p) => {
            const selected = time === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setTime(p.value)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetLabel,
                    { color: selected ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.presetValue,
                    { color: selected ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {p.value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.timeColumns}>
          <View style={styles.timeColumn}>
            <Text style={[styles.timeColLabel, { color: theme.colors.textSecondary }]}>
              Hora
            </Text>
            <ScrollView
              style={styles.timeScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {HOURS.map((hh) => {
                const selected = h === hh;
                return (
                  <Pressable
                    key={hh}
                    onPress={() => setHour(hh)}
                    style={[
                      styles.timePill,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryStrong
                          : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        {
                          color: selected
                            ? '#FFFFFF'
                            : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {pad(hh)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.timeColumn}>
            <Text style={[styles.timeColLabel, { color: theme.colors.textSecondary }]}>
              Min
            </Text>
            <ScrollView
              style={styles.timeScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {MINUTES.map((mm) => {
                const selected = m === mm;
                return (
                  <Pressable
                    key={mm}
                    onPress={() => setMinute(mm)}
                    style={[
                      styles.timePill,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryStrong
                          : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        {
                          color: selected
                            ? '#FFFFFF'
                            : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {pad(mm)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
        <View style={styles.timeEditorActions}>
          <Pressable
            onPress={() => {
              setTime('');
              setTimeOpen(false);
            }}
            style={styles.timeEditorGhost}
          >
            <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
            <Text
              style={[styles.timeEditorGhostText, { color: theme.colors.danger }]}
            >
              Sin hora
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTimeOpen(false)}
            style={[
              styles.timeEditorApply,
              { backgroundColor: theme.colors.primaryStrong },
            ]}
          >
            <Text style={styles.timeEditorApplyText}>Listo</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderStep3 = () => (
    <>
      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => selectTemporality('puntual')}
          style={[
            styles.segmentOption,
            {
              backgroundColor:
                temporality === 'puntual'
                  ? theme.colors.primaryStrong
                  : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={
              temporality === 'puntual'
                ? '#FFFFFF'
                : theme.colors.textSecondary
            }
          />
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              {
                color:
                  temporality === 'puntual'
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
                fontWeight: temporality === 'puntual' ? '800' : '600',
              },
            ]}
          >
            Puntual (Fecha fija)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => selectTemporality('periodica')}
          style={[
            styles.segmentOption,
            {
              backgroundColor:
                temporality === 'periodica'
                  ? theme.colors.primaryStrong
                  : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Ionicons
            name="repeat-outline"
            size={14}
            color={
              temporality === 'periodica'
                ? '#FFFFFF'
                : theme.colors.textSecondary
            }
          />
          <Text
            numberOfLines={1}
            style={[
              styles.segmentText,
              {
                color:
                  temporality === 'periodica'
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
                fontWeight: temporality === 'periodica' ? '800' : '600',
              },
            ]}
          >
            Periódica (Rutina)
          </Text>
        </Pressable>
      </View>

      {temporality === 'puntual' ? (
        <>
          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Fecha de la tarea
            </Text>
            <DurationToggle
              mode={rangeMode}
              onChange={setRangeMode}
              theme={theme}
              labels={['Un solo día', 'Varios días']}
            />
            <Pressable
              onPress={() => setCalOpen((v) => !v)}
              style={[styles.dateField, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.dateFieldText,
                  {
                    color: dueDate
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {dueDate ? `Empieza · ${formatLongDate(dueDate)}` : 'Empieza · elige una fecha'}
              </Text>
              <Ionicons
                name={calOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            {calOpen ? (
              <InlineCalendar value={dueDate} onChange={setDueDate} theme={theme} />
            ) : null}
            {rangeMode ? (
              <>
                <Pressable
                  onPress={() => setEndCalOpen((v) => !v)}
                  style={[styles.dateField, { backgroundColor: theme.colors.surfaceVariant, marginTop: 8 }]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.dateFieldText,
                      {
                        color: endDate
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {endDate ? `Termina · ${formatLongDate(endDate)}` : 'Termina · elige la última fecha'}
                  </Text>
                  <Ionicons
                    name={endCalOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
                {endCalOpen ? (
                  <InlineCalendar value={endDate} onChange={setEndDate} theme={theme} />
                ) : null}
              </>
            ) : null}
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              {rangeMode
                ? endDate && endDate >= dueDate
                  ? `Una sola tarea del ${formatLongDate(dueDate)} al ${formatLongDate(endDate)}.`
                  : 'Elige la fecha de inicio y después la de fin.'
                : dueDate
                  ? `Tarea puntual el ${formatLongDate(dueDate)} (${dueDate}).`
                  : 'Elige la fecha en el calendario.'}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Hora (opcional)
            </Text>
            {renderTimeField()}
            {timeOpen ? renderTimePanel() : null}
          </View>
        </>
      ) : (
        <>
          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Empieza el
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              La rutina no se muestra antes de esta fecha
            </Text>
            <Pressable
              onPress={() => setStartCalOpen((v) => !v)}
              style={[styles.dateField, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.dateFieldText,
                  {
                    color: startDate
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {startDate ? formatLongDate(startDate) : 'Elige la fecha de inicio'}
              </Text>
              <Ionicons
                name={startCalOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            {startCalOpen ? (
              <InlineCalendar value={startDate} onChange={handleStartDateChange} theme={theme} />
            ) : null}
          </View>

          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Duración
            </Text>
            <DurationToggle
              mode={rangeMode}
              onChange={setRangeMode}
              theme={theme}
              labels={['Día único', 'Varios días']}
            />
          </View>

          {rangeMode ? (
            <View style={cardStyle}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Termina el
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Una sola tarea que cubre el rango entero, sin duplicados por día
              </Text>
              <Pressable
                onPress={() => setEndCalOpen((v) => !v)}
                style={[styles.dateField, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dateFieldText,
                    {
                      color: endDate
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {endDate ? `Termina · ${formatLongDate(endDate)}` : 'Termina · elige la última fecha'}
                </Text>
                <Ionicons
                  name={endCalOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
              {endCalOpen ? (
                <InlineCalendar value={endDate} onChange={setEndDate} theme={theme} />
              ) : null}
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                {endDate && endDate >= startDate
                  ? `El rango ${formatRangeLong(startDate, endDate)} se repite cada ${repeatIntervalDays} días.`
                  : 'Elige la última fecha del rango.'}
              </Text>
            </View>
          ) : (
            <View style={cardStyle}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                Días de la rutina
              </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Mostramos los días con su número de la semana en la que empieza
            </Text>
            <View style={styles.daysRow}>
              {contextWeek.map(({ dow, date, label }) => {
                const selected = days.includes(dow);
                const pastBeforeStart = startDate
                  ? date.getTime() < fromDateKey(startDate).getTime()
                  : false;
                return (
                  <Pressable
                    key={dow}
                    onPress={() => toggleDay(dow)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryStrong
                          : theme.colors.surfaceVariant,
                        opacity: pastBeforeStart && !selected ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipLetter,
                        {
                          color: selected
                            ? '#FFFFFF'
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {DAY_LABELS[dow]}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipNum,
                        {
                          color: selected
                            ? '#FFFFFF'
                            : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          )}

          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Frecuencia
            </Text>
            <View style={styles.periodRow}>
              {FREQUENCY_OPTIONS.map((option) => {
                const active =
                  customDias.length === 0 &&
                  repeatIntervalDays === option.dias;
                return (
                  <Pressable
                    key={option.dias}
                    onPress={() => pickFrequency(option.dias)}
                    style={[
                      styles.periodPill,
                      {
                        backgroundColor: active
                          ? theme.colors.primaryStrong
                          : theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        {
                          color: active
                            ? '#FFFFFF'
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.customRow}>
              <Text
                style={[styles.customLabel, { color: theme.colors.textSecondary }]}
              >
                Cada
              </Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => stepDays(-1)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    },
                  ]}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>
                <TextInput
                  value={customDias || String(repeatIntervalDays)}
                  onChangeText={handleCustomDias}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1.5,
                      borderColor: theme.colors.divider,
                      color: theme.colors.textPrimary,
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => stepDays(1)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>
              </View>
              <Text
                style={[styles.customLabel, { color: theme.colors.textSecondary }]}
              >
                días
              </Text>
            </View>
          </View>

          <View style={cardStyle}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Proyección
            </Text>
            {rangeMode ? (
              <>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {startDate && endDate && endDate >= startDate
                    ? `Rango ${formatRangeLong(startDate, endDate)} que se repite cada ${repeatIntervalDays} días desde ${formatLongDate(startDate)}.`
                    : 'Configura fecha de inicio y fin para ver la proyección.'}
                </Text>
                {nextRangeStarts.length > 0 ? (
                  <View style={styles.occRow}>
                    {nextRangeStarts.map((d, idx) => (
                      <View
                        key={toDateKey(d)}
                        style={[styles.occPill, { backgroundColor: theme.colors.surface }]}
                      >
                        <Text style={[styles.occText, { color: theme.colors.textPrimary }]}>
                          Ciclo {idx + 1} · {d.getDate()}{' '}
                          {MONTH_SHORT[d.getMonth()]}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {startDate
                    ? `Empieza a contar desde el ${formatLongDate(startDate)}. Nada antes.`
                    : 'Configura la fecha de inicio para ver la proyección.'}
                </Text>
                {nextOccurrences.length > 0 ? (
                  <View style={styles.occRow}>
                    {nextOccurrences.map((d) => (
                      <View
                        key={toDateKey(d)}
                        style={[styles.occPill, { backgroundColor: theme.colors.surface }]}
                      >
                        <Text style={[styles.occText, { color: theme.colors.textPrimary }]}>
                          {DAY_LABELS[d.getDay() as DayOfWeek]} {d.getDate()}{' '}
                          {MONTH_SHORT[d.getMonth()]}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </>
      )}
    </>
  );

  const renderActions = () => (
    <View style={styles.actions}>
      {task ? (
        confirmingDelete ? (
          <View style={styles.confirmRow}>
            <Pressable
              onPress={() => setConfirmingDelete(false)}
              style={[styles.confirmBtn, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text style={[styles.confirmBtnText, { color: theme.colors.textSecondary }]}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.confirmBtn, { backgroundColor: theme.colors.danger }]}
            >
              <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                Confirmar eliminar
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmingDelete(true)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
            <Text style={[styles.deleteText, { color: theme.colors.danger }]}>
              Eliminar
            </Text>
          </Pressable>
        )
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {step > 1 ? (
        <PillButton
          label="Atrás"
          variant="primary"
          onPress={() => setStep((s) => s - 1)}
        />
      ) : null}
      {step < 3 ? (
        <PillButton
          label="Siguiente"
          variant="strong"
          onPress={goNext}
          disabled={!canAdvance}
        />
      ) : (
        <PillButton
          label={task ? 'Guardar cambios' : 'Crear tarea'}
          variant="strong"
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      )}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      subtitle={
        task
          ? 'Título, responsable y temporalidad en tres pasos.'
          : 'Datos, responsable y cuándo en tres pasos.'
      }
    >
      {renderSteps()}
      {step === 1 ? renderStep1() : null}
      {step === 2 ? renderStep2() : null}
      {step === 3 ? renderStep3() : null}
      {renderActions()}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepLabelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 10,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 13,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 999,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    paddingVertical: 10,
    marginBottom: 12,
  },
  toggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  customInput: {
    width: 48,
    height: 36,
    paddingHorizontal: 6,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'visible',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingRight: 8,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  durationWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  durationOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 999,
  },
  durationText: {
    fontSize: 13,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 13,
    flexShrink: 1,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  dateFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  calBox: {
    marginTop: 12,
    gap: 8,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  calHeaderRow: {
    flexDirection: 'row',
  },
  calHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calRow: {
    flexDirection: 'row',
  },
  calCell: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  calDayNum: {
    fontSize: 14,
  },
  calQuick: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  calQuickPill: {
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calQuickText: {
    fontSize: 13,
    fontWeight: '800',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayChipLetter: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayChipNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  occRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  occPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  occText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
  },
  timeFieldText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  timeEditor: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetValue: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  timeColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timeScroll: {
    height: 168,
    alignSelf: 'stretch',
  },
  timePill: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  timePillText: {
    fontSize: 15,
    fontWeight: '800',
  },
  timeEditorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeEditorGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  timeEditorGhostText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeEditorApply: {
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeEditorApplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 'auto',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
