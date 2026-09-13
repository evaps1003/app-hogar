import React, { useEffect, useState } from 'react';
import {
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
} from '../data/schedule';
import { DayOfWeek, RotatingTurn, TaskSchedule } from '../data/types';
import { useTheme } from '../theme';

const DAY_MS = 24 * 60 * 60 * 1000;

const ROTATION_FREQUENCY = [
  { dias: 7, label: 'Semanal' },
  { dias: 15, label: 'Quincenal' },
  { dias: 30, label: 'Mensual' },
];

type TaskKind = 'free' | 'assigned';
type ScheduleMode = 'none' | 'flexible' | 'specific';

interface NewTaskFormProps {
  visible: boolean;
  onClose: () => void;
  initialDay?: DayOfWeek;
}

export function NewTaskForm({ visible, onClose, initialDay }: NewTaskFormProps) {
  const { theme } = useTheme();
  const { members } = useHousehold();
  const { addTask } = useTasks();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TaskKind>('free');
  const [assigneeId, setAssigneeId] = useState<string | null>(
    members[0]?.id ?? null,
  );
  const [mode, setMode] = useState<ScheduleMode>('none');
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [time, setTime] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [turnMembers, setTurnMembers] = useState<string[]>([]);
  const [frecuenciaDias, setFrecuenciaDias] = useState(7);
  const [customDias, setCustomDias] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setKind(initialDay ? 'assigned' : 'free');
      setAssigneeId(members[0]?.id ?? null);
      setMode(initialDay ? 'specific' : 'none');
      setDays(initialDay ? [initialDay] : []);
      setTime('');
      setRepeatWeekly(false);
      setRotating(false);
      setTurnMembers([]);
      setFrecuenciaDias(7);
      setCustomDias('');
    }
  }, [visible, members, initialDay]);

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

  const handleFlexible = () => {
    setMode('flexible');
    setDays([]);
    setTime('');
    setRepeatWeekly(false);
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
    title.trim().length > 0 && (!rotating || turnMembers.length > 0);

  const buildSchedule = (): TaskSchedule | undefined => {
    if (rotating) return undefined;
    if (mode === 'flexible') {
      return { type: 'flexible', weekKey: getCurrentWeekKey() };
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
    return {
      esRotativa: true,
      miembrosTurno: turnMembers,
      indiceTurnoActual: 0,
      frecuenciaRotacion: frecuenciaDias,
      fechaInicioCiclo: now,
      proximaRotacion: now + frecuenciaDias * DAY_MS,
    };
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    addTask({
      title: title.trim(),
      assigneeId: rotating ? turnMembers[0] ?? null : assigneeId,
      schedule: buildSchedule(),
      rotacion: buildRotacion(),
    });
    onClose();
  };

  const selectingDays = mode === 'specific';
  const wheelMembers = [
    ...turnMembers.map((id) => members.find((m) => m.id === id)),
    ...members.filter((m) => !turnMembers.includes(m.id)),
  ].filter((member) => member !== undefined);

  const renderSchedule = () => (
    <>
      <View style={styles.fieldLabel}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          ¿Cuándo?
        </Text>
      </View>

      <Pressable
        onPress={handleFlexible}
        style={[
          styles.flexiblePill,
          {
            backgroundColor:
              mode === 'flexible'
                ? theme.colors.primarySoft
                : theme.colors.surfaceVariant,
            borderWidth: 1.5,
            borderColor:
              mode === 'flexible' ? theme.colors.primaryStrong : 'transparent',
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={15}
          color={
            mode === 'flexible'
              ? theme.colors.primaryStrong
              : theme.colors.textSecondary
          }
        />
        <Text
          style={[
            styles.flexibleText,
            {
              color:
                mode === 'flexible'
                  ? theme.colors.primaryStrong
                  : theme.colors.textSecondary,
            },
          ]}
        >
          Flexible esta semana
        </Text>
      </Pressable>

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

      {selectingDays ? (
        <View style={styles.specificRow}>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="10:00"
            placeholderTextColor={theme.colors.tabInactive}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            style={[
              styles.timeInput,
              {
                backgroundColor: theme.colors.surfaceVariant,
                color: theme.colors.textPrimary,
                borderRadius: theme.radius.pill,
              },
            ]}
          />
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
      ) : null}

      {selectingDays && !repeatWeekly ? (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Tarea puntual: solo existirá los días elegidos de esta semana.
        </Text>
      ) : null}
    </>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nueva tarea"
      subtitle="Según la elijas, irá a Tareas del Hogar o a la Bolsa común."
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
        <PillButton label="Cancelar" variant="ghost" onPress={onClose} />
        <PillButton
          label="Añadir tarea"
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
  flexiblePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 999,
  },
  flexibleText: {
    fontSize: 14,
    fontWeight: '800',
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
  timeInput: {
    width: 96,
    height: 40,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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
});