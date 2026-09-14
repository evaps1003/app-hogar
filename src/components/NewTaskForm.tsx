import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
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
  WEEKDAY_ORDER,
  getCurrentWeekKey,
  toDateKey,
  fromDateKey,
  addDays,
  addWeeks,
  startOfWeek,
  weekRangeLabel,
  weekRangeFullLabel,
  getWeekOptions,
  weekKeyOffset,
  MONTH_NAMES,
} from '../data/schedule';
import {
  DayOfWeek,
  RotatingTurn,
  Task,
  TaskCategory,
  TaskSchedule,
} from '../data/types';
import { buildCategoryOptions } from '../data/categories';
import { useTheme } from '../theme';

const DAY_MS = 24 * 60 * 60 * 1000;

const ROTATION_FREQUENCY = [
  { dias: 7, label: 'Semanal' },
  { dias: 15, label: 'Quincenal' },
  { dias: 30, label: 'Mensual' },
];

type TaskKind = 'free' | 'assigned';
type ScheduleMode = 'none' | 'flexible' | 'specific' | 'once';

interface NewTaskFormProps {
  visible: boolean;
  onClose: () => void;
  initialDay?: DayOfWeek;
  initialDays?: DayOfWeek[];
  initialDate?: string;
  task?: Task | null;
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

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('otros');
  const [kind, setKind] = useState<TaskKind>('free');
  const [assigneeId, setAssigneeId] = useState<string | null>(
    members[0]?.id ?? null,
  );
  const [mode, setMode] = useState<ScheduleMode>('none');
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [time, setTime] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [flexWeekOffset, setFlexWeekOffset] = useState(0);
  const [calCursor, setCalCursor] = useState<Date>(new Date());
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [timeEditorHour, setTimeEditorHour] = useState(10);
  const [timeEditorMin, setTimeEditorMin] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [turnMembers, setTurnMembers] = useState<string[]>([]);
  const [frecuenciaDias, setFrecuenciaDias] = useState(7);
  const [customDias, setCustomDias] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (task) {
      const rot = task.rotacion;
      const hasRotacion = !!rot;
      setTitle(task.title);
      setCategory(task.category ?? 'otros');
      setRotating(hasRotacion);
      setTurnMembers(rot?.miembrosTurno ?? []);
      setFrecuenciaDias(rot?.frecuenciaRotacion ?? 7);
      setCustomDias('');
      setKind(hasRotacion || task.assigneeId ? 'assigned' : 'free');
      setAssigneeId(task.assigneeId ?? members[0]?.id ?? null);
      const sched = task.schedule;
      if (hasRotacion || !sched) {
        setMode('none');
        setDays([]);
        setTime('');
        setDueDate('');
        setRepeatWeekly(false);
        setFlexWeekOffset(0);
      } else if (sched.type === 'flexible') {
        setMode('flexible');
        setDays([]);
        setTime('');
        setDueDate('');
        setRepeatWeekly(false);
        setFlexWeekOffset(weekKeyOffset(sched.weekKey));
      } else if (sched.type === 'once') {
        setMode('once');
        setDays([]);
        setTime(sched.time ?? '');
        setDueDate(sched.dueDate);
        setRepeatWeekly(false);
        setFlexWeekOffset(0);
        setCalCursor(fromDateKey(sched.dueDate));
      } else {
        setMode('specific');
        setDays(sched.days);
        setTime(sched.time ?? '');
        setDueDate('');
        setRepeatWeekly(sched.repeatWeekly);
        setFlexWeekOffset(0);
      }
      setTimeEditorOpen(false);
      return;
    }
    setTitle('');
    setCategory('otros');
    const prefill = initialDays && initialDays.length > 0 ? initialDays : initialDay ? [initialDay] : [];
    if (initialDate) {
      setMode('once');
      setDueDate(initialDate);
      setDays([]);
      setKind('assigned');
      setAssigneeId(members[0]?.id ?? null);
      setCalCursor(fromDateKey(initialDate));
    } else {
      setMode(prefill.length > 0 ? 'specific' : 'none');
      setDueDate('');
      setDays(prefill);
      setKind(prefill.length > 0 ? 'assigned' : 'free');
      setAssigneeId(members[0]?.id ?? null);
      setCalCursor(new Date());
    }
    setTime('');
    setRepeatWeekly(false);
    setFlexWeekOffset(0);
    setTimeEditorOpen(false);
    setRotating(false);
    setTurnMembers([]);
    setFrecuenciaDias(7);
    setCustomDias('');
  }, [visible, members, initialDay, initialDays, initialDate, task]);

  const selectKind = (next: TaskKind) => {
    setKind(next);
    if (next === 'free') {
      setRotating(false);
      setTurnMembers([]);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
    if (mode !== 'specific') setMode('specific');
  };

  const selectMode = (next: ScheduleMode) => {
    if (next === mode) return;
    setMode(next);
    if (next === 'flexible') {
      setDays([]);
      setDueDate('');
      setTimeEditorOpen(false);
    } else if (next === 'once') {
      setDays([]);
      setFlexWeekOffset(0);
    } else if (next === 'specific') {
      setDueDate('');
    }
    setTimeEditorOpen(false);
  };

  const openTimeEditor = () => {
    const [h, m] = (time || '10:00').split(':').map(Number);
    setTimeEditorHour(Number.isFinite(h) && h >= 0 && h <= 23 ? h : 10);
    setTimeEditorMin(Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0);
    setTimeEditorOpen(true);
  };

  const applyTimeEditor = () => {
    setTime(
      `${String(timeEditorHour).padStart(2, '0')}:${String(
        timeEditorMin,
      ).padStart(2, '0')}`,
    );
    setTimeEditorOpen(false);
  };

  const clearTime = () => {
    setTime('');
    setTimeEditorOpen(false);
  };

  const moveCalMonth = (delta: number) => {
    setCalCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const toggleTurnMember = (id: string) => {
    setTurnMembers((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  const pickFrequency = (dias: number) => {
    setFrecuenciaDias(dias);
    setCustomDias('');
  };

  const handleCustomDias = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setCustomDias(digits);
    const value = Number(digits);
    if (value > 0) setFrecuenciaDias(value);
  };

  const canSubmit =
    title.trim().length > 0 &&
    (!rotating || turnMembers.length > 0) &&
    (mode !== 'once' || dueDate.length > 0);

  const buildSchedule = (): TaskSchedule | undefined => {
    if (rotating) return undefined;
    if (mode === 'flexible') {
      const options = getWeekOptions();
      return {
        type: 'flexible',
        weekKey:
          options[flexWeekOffset]?.weekKey ?? getCurrentWeekKey(),
      };
    }
    if (mode === 'once' && dueDate.length > 0) {
      return {
        type: 'once',
        dueDate,
        time: time.trim() || null,
      };
    }
    if (mode === 'specific' && days.length > 0) {
      return {
        type: 'scheduled',
        days,
        time: time.trim() || null,
        repeatWeekly,
        weekKey: repeatWeekly ? undefined : getCurrentWeekKey(),
      };
    }
    return undefined;
  };

  const buildRotacion = (): RotatingTurn | undefined => {
    if (!rotating || turnMembers.length === 0) return undefined;
    const now = Date.now();
    const base = task?.rotacion;
    const indice = base?.indiceTurnoActual ?? 0;
    const proxima = base?.proximaRotacion ?? now + frecuenciaDias * DAY_MS;
    return {
      esRotativa: true,
      miembrosTurno: turnMembers,
      indiceTurnoActual: indice,
      frecuenciaRotacion: frecuenciaDias,
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
    const data = {
      title: title.trim(),
      assigneeId: rotating ? turnMembers[0] ?? null : assigneeId,
      schedule: buildSchedule(),
      rotacion: buildRotacion(),
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
    Alert.alert(
      'Eliminar tarea',
      `¿Seguro que quieres eliminar «${task.title}»? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTask(task.id);
            onClose();
          },
        },
      ],
    );
  };

  const renderTimeField = () => (
    <Pressable onPress={openTimeEditor} style={[styles.timeField, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
      <Text style={[styles.timeFieldText, { color: time ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
        {time || 'Sin hora · todo el día'}
      </Text>
      <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
    </Pressable>
  );

  const renderTimePanel = () => (
    <View style={[styles.timeEditor, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.timeStepperRow}>
        <View style={styles.timeStepper}>
          <Text style={[styles.timeStepperLabel, { color: theme.colors.textSecondary }]}>Hora</Text>
          <View style={styles.timeStepCtl}>
            <Pressable hitSlop={6} onPress={() => setTimeEditorHour((p) => (p + 23) % 24)}>
              <Ionicons name="remove" size={20} color={theme.colors.primaryStrong} />
            </Pressable>
            <Text style={[styles.timeStepValue, { color: theme.colors.textPrimary }]}>
              {String(timeEditorHour).padStart(2, '0')}
            </Text>
            <Pressable hitSlop={6} onPress={() => setTimeEditorHour((p) => (p + 1) % 24)}>
              <Ionicons name="add" size={20} color={theme.colors.primaryStrong} />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.timeColon, { color: theme.colors.textSecondary }]}>:</Text>
        <View style={styles.timeStepper}>
          <Text style={[styles.timeStepperLabel, { color: theme.colors.textSecondary }]}>Min</Text>
          <View style={styles.timeStepCtl}>
            <Pressable hitSlop={6} onPress={() => setTimeEditorMin((p) => (p + 55) % 60)}>
              <Ionicons name="remove" size={20} color={theme.colors.primaryStrong} />
            </Pressable>
            <Text style={[styles.timeStepValue, { color: theme.colors.textPrimary }]}>
              {String(timeEditorMin).padStart(2, '0')}
            </Text>
            <Pressable hitSlop={6} onPress={() => setTimeEditorMin((p) => (p + 5) % 60)}>
              <Ionicons name="add" size={20} color={theme.colors.primaryStrong} />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.timeEditorActions}>
        <Pressable onPress={clearTime} style={styles.timeEditorGhost}>
          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
          <Text style={[styles.timeEditorGhostText, { color: theme.colors.danger }]}>Sin hora</Text>
        </Pressable>
        <Pressable onPress={applyTimeEditor} style={[styles.timeEditorApply, { backgroundColor: theme.colors.primaryStrong }]}>
          <Text style={styles.timeEditorApplyText}>Listo</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderTimeEditor = () => (
    <>
      {renderTimeField()}
      {timeEditorOpen ? renderTimePanel() : null}
    </>
  );

  const renderCalendar = () => {
    const calYear = calCursor.getFullYear();
    const calMonth = calCursor.getMonth();
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
          <Pressable hitSlop={8} onPress={() => moveCalMonth(-1)}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.primaryStrong} />
          </Pressable>
          <Text style={[styles.calNavTitle, { color: theme.colors.textPrimary }]}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
          <Pressable hitSlop={8} onPress={() => moveCalMonth(1)}>
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
                const date = new Date(calYear, calMonth, day);
                const key = toDateKey(date);
                const isSelected = dueDate === key;
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={col}
                    onPress={() => setDueDate(key)}
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
          <Pressable onPress={() => { setDueDate(toDateKey(new Date())); setCalCursor(new Date()); }} style={[styles.calQuickPill, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.calQuickText, { color: theme.colors.primaryStrong }]}>Hoy</Text>
          </Pressable>
          <Pressable onPress={() => { const t = addDays(new Date(), 1); setDueDate(toDateKey(t)); setCalCursor(t); }} style={[styles.calQuickPill, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.calQuickText, { color: theme.colors.primaryStrong }]}>Mañana</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderWeekSelector = () => (
    <View style={styles.weekList}>
      {getWeekOptions().map((opt) => {
        const selected = flexWeekOffset === opt.offset;
        return (
          <Pressable
            key={opt.weekKey}
            onPress={() => setFlexWeekOffset(opt.offset)}
            style={[
              styles.weekOption,
              {
                backgroundColor: selected
                  ? theme.colors.primarySoft
                  : theme.colors.surfaceVariant,
                borderWidth: 1.5,
                borderColor: selected
                  ? theme.colors.primaryStrong
                  : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={17}
              color={selected ? theme.colors.primaryStrong : theme.colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.weekOptionLabel, { color: theme.colors.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.weekOptionSub, { color: theme.colors.textSecondary }]}>
                {weekRangeFullLabel(startOfWeek(addWeeks(startOfWeek(), opt.offset)))}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSchedule = () => (
    <>
      <View style={styles.fieldLabel}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          ¿Cuándo?
        </Text>
      </View>

      <View style={styles.modeRow}>
        {(
          [
            { key: 'once' as const, label: 'Por fecha concreta', icon: 'calendar-outline' as const },
            { key: 'specific' as const, label: 'Rutina semanal', icon: 'repeat-outline' as const },
            { key: 'flexible' as const, label: 'Flexible', icon: 'time-outline' as const },
          ]
        ).map((option) => {
          const active = mode === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => selectMode(option.key)}
              style={[
                styles.modePill,
                {
                  backgroundColor: active
                    ? theme.colors.primarySoft
                    : theme.colors.surfaceVariant,
                  borderWidth: 1.5,
                  borderColor: active
                    ? theme.colors.primaryStrong
                    : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={active ? theme.colors.primaryStrong : theme.colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.modePillText,
                  {
                    color: active
                      ? theme.colors.primaryStrong
                      : theme.colors.textSecondary,
                    fontWeight: active ? '800' : '600',
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'once' ? (
        <>
          {renderCalendar()}
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {dueDate
              ? `Tarea puntual el ${fromDateKey(dueDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}.`
              : 'Elige una fecha en el calendario.'}
          </Text>
          {renderTimeEditor()}
        </>
      ) : null}

      {mode === 'flexible' ? (
        <>
          {renderWeekSelector()}
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Fija la semana de inicio: la tarea solo aparecerá en ese bloque, sin
            duplicarse en semanas futuras.
          </Text>
        </>
      ) : null}

      {mode === 'specific' ? (
        <>
          <View style={styles.daysRow}>
            {WEEKDAY_ORDER.map((day) => {
              const selected = days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: selected
                        ? theme.colors.primaryStrong
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      {
                        color: selected ? '#FFFFFF' : theme.colors.textSecondary,
                        fontWeight: selected ? '800' : '600',
                      },
                    ]}
                  >
                    {DAY_LABELS[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.specificRow}>
            <View style={styles.specificTimeWrap}>
              {renderTimeField()}
              {timeEditorOpen ? renderTimePanel() : null}
            </View>
            <Pressable
              onPress={() => setRepeatWeekly((prev) => !prev)}
              style={styles.repeatToggle}
            >
              <Ionicons
                name={repeatWeekly ? 'checkbox' : 'square-outline'}
                size={18}
                color={
                  repeatWeekly
                    ? theme.colors.primaryStrong
                    : theme.colors.tabInactive
                }
              />
              <Text style={[styles.repeatText, { color: theme.colors.textPrimary }]}>
                Repetir todas las semanas
              </Text>
            </Pressable>
          </View>

          {!repeatWeekly ? (
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Tarea puntual: solo existirá los días elegidos de esta semana.
            </Text>
          ) : null}
        </>
      ) : null}
    </>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      subtitle={
        task
          ? 'Puedes cambiar todo: responsabilidad, categoría, días y turnos.'
          : 'Según la elijas, irá a Tareas del Hogar o a la Bolsa común.'
      }
    >
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

      <View style={styles.fieldLabel}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          ¿De qué tipo?
        </Text>
      </View>
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
                    ? theme.colors.infoStrong
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
                style={[
                  styles.categoryText,
                  {
                    color: selected ? '#FFFFFF' : theme.colors.textSecondary,
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

      <View style={styles.fieldLabel}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          ¿Quién la hace?
        </Text>
      </View>
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
            { key: 'free', label: 'Libre · Bolsa' },
            { key: 'assigned', label: 'Para alguien' },
          ] as { key: TaskKind; label: string }[]
        ).map((option) => {
          const active = kind === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => selectKind(option.key)}
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

      {kind === 'assigned' ? (
        <>
          {!rotating ? (
            <>
              <View style={styles.fieldLabel}>
                <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                  Asignar a
                </Text>
              </View>
              <View style={styles.membersRow}>
                {members.map((member) => {
                  const selected = assigneeId === member.id;
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
              {renderSchedule()}
            </>
          ) : null}

          <Pressable
            onPress={() => setRotating((prev) => !prev)}
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
                rotating
                  ? theme.colors.primaryStrong
                  : theme.colors.tabInactive
              }
            />
            <Text style={[styles.toggleText, { color: theme.colors.textPrimary }]}>
              Tarea rotativa (por turnos)
            </Text>
            <Ionicons
              name={rotating ? 'checkbox' : 'square-outline'}
              size={20}
              color={
                rotating
                  ? theme.colors.primaryStrong
                  : theme.colors.tabInactive
              }
            />
          </Pressable>

          {rotating ? (
            <>
              <View style={styles.fieldLabel}>
                <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                  Rueda de turnos
                </Text>
              </View>
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
                El turno 1 (primer nombre) empieza como responsable; al
                cumplirse el plazo la tarea rota automáticamente.
              </Text>

              <View style={styles.fieldLabel}>
                <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                  Frecuencia de rotación
                </Text>
              </View>
              <View style={styles.periodRow}>
                {ROTATION_FREQUENCY.map((option) => {
                  const active =
                    customDias.length === 0 && frecuenciaDias === option.dias;
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
                <Text style={[styles.customLabel, { color: theme.colors.textSecondary }]}>
                  Cada
                </Text>
                <TextInput
                  value={customDias}
                  onChangeText={handleCustomDias}
                  placeholder="7"
                  placeholderTextColor={theme.colors.tabInactive}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      color: theme.colors.textPrimary,
                      borderWidth: 1.5,
                      borderColor:
                        customDias.length > 0
                          ? theme.colors.primaryStrong
                          : 'transparent',
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                />
                <Text style={[styles.customLabel, { color: theme.colors.textSecondary }]}>
                  días
                </Text>
              </View>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Nadie lo reserva: la verás en la Bolsa común para que quien pueda la
            tome y se lleve su sello de mérito.
          </Text>
          {renderSchedule()}
        </>
      )}

      <View style={styles.actions}>
        {task ? (
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={theme.colors.danger}
            />
            <Text
              style={[styles.deleteText, { color: theme.colors.danger }]}
            >
              Eliminar
            </Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <PillButton label="Cancelar" variant="ghost" onPress={onClose} />
        <PillButton
          label={task ? 'Guardar cambios' : 'Añadir tarea'}
          variant="strong"
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '600',
  },
  fieldLabel: {
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 13,
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
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberChip: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '700',
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  customInput: {
    width: 72,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 50,
    marginTop: 14,
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    paddingRight: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  modePillText: {
    fontSize: 12,
    flexShrink: 1,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  dayPill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: 14,
  },
  specificRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  specificTimeWrap: {
    flex: 1,
    gap: 8,
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
  },
  timeEditor: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  timeStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  timeStepper: {
    alignItems: 'center',
    gap: 4,
  },
  timeStepperLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeStepCtl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 44,
  },
  timeStepValue: {
    fontSize: 24,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 26,
    fontWeight: '700',
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
    minHeight: 40,
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
  weekList: {
    gap: 8,
    marginTop: 12,
  },
  weekOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: 14,
  },
  weekOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  weekOptionSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  repeatText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 28,
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
});