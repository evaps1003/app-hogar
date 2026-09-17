import {
  DayOfWeek,
  RotatingTurn,
  ScheduledSchedule,
  TaskSchedule,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const MONTH_NAMES: string[] = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MONTH_SHORT: string[] = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
  0: 'D',
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  0: 'Dom',
};

export const DAY_LONG_LABELS: Record<DayOfWeek, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo',
};

export const WEEKDAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function getCurrentWeekKey(date: Date = new Date()): string {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

export function shortDateLabel(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${MONTH_SHORT[monday.getMonth()]}`;
  }
  return `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]}–${sunday.getDate()} ${MONTH_SHORT[sunday.getMonth()]}`;
}

export function weekRangeFullLabel(monday: Date): string {
  return `Semana del ${shortDateLabel(monday)} al ${shortDateLabel(addDays(monday, 6))}`;
}

export interface WeekOption {
  offset: number;
  weekKey: string;
  label: string;
  sublabel: string;
}

export function getWeekOptions(count: number = 6): WeekOption[] {
  const today = new Date();
  const monday = startOfWeek(today);
  const labels = ['Esta semana', 'Semana que viene'];
  return Array.from({ length: count }, (_, i) => {
    const m = addWeeks(monday, i);
    const wk = getCurrentWeekKey(m);
    return {
      offset: i,
      weekKey: wk,
      label: i < labels.length ? labels[i] : `En ${i} semanas`,
      sublabel: weekRangeLabel(m),
    };
  });
}

export function weekKeyOffset(target: string, base: Date = new Date()): number {
  const baseMonday = startOfWeek(base);
  for (let i = 0; i < 12; i++) {
    const m = addWeeks(baseMonday, i);
    if (getCurrentWeekKey(m) === target) return i;
  }
  return 0;
}

export function weekdayOffsetOf(dow: DayOfWeek): number {
  return (dow + 6) % 7;
}

export function dateInWeekMonday(monday: Date, dow: DayOfWeek): Date {
  return addDays(monday, weekdayOffsetOf(dow));
}

export function scheduleRangeKeys(
  schedule: TaskSchedule,
): { start: string; end: string } | null {
  if (schedule.type === 'flexible') return null;
  if (schedule.type === 'once') {
    if (!schedule.endDate || schedule.endDate === schedule.dueDate) return null;
    return { start: schedule.dueDate, end: schedule.endDate };
  }
  if (schedule.startDate && schedule.endDate && schedule.endDate !== schedule.startDate) {
    return { start: schedule.startDate, end: schedule.endDate };
  }
  return null;
}

export function scheduleIsRange(schedule: TaskSchedule | undefined): boolean {
  return !!schedule && scheduleRangeKeys(schedule) !== null;
}

export function formatRangeLabel(startKey: string, endKey: string): string {
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_SHORT[start.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]}–${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;
}

export function scheduledOccursOn(schedule: ScheduledSchedule, date: Date): boolean {
  const dayStart = startOfDay(date);
  const dow = date.getDay() as DayOfWeek;

  if (schedule.endDate && schedule.startDate) {
    const key = toDateKey(dayStart);
    if (key >= schedule.startDate && key <= schedule.endDate) return true;
    return false;
  }

  if (!schedule.days.includes(dow)) return false;

  if (schedule.weekKey) {
    return getCurrentWeekKey(date) === schedule.weekKey;
  }

  const target = dayStart;

  if (schedule.startDate) {
    const start = startOfDay(fromDateKey(schedule.startDate));
    if (target.getTime() < start.getTime()) return false;
  }

  const interval = schedule.repeatIntervalDays;
  if (interval == null || interval <= 0 || !schedule.startDate) {
    return true;
  }

  const start = startOfDay(fromDateKey(schedule.startDate));
  const anchor = startOfWeek(start);
  const slot = dateInWeekMonday(anchor, dow);
  const gap = Math.round((target.getTime() - slot.getTime()) / DAY_MS);
  return gap % interval === 0;
}

export function rotatingPeriodDays(rotacion: RotatingTurn): number {
  return rotacion.frecuenciaRotacion > 0 ? rotacion.frecuenciaRotacion : 7;
}

export function rotatingCycleIndex(rotacion: RotatingTurn, date: Date): number {
  const period = rotatingPeriodDays(rotacion);
  const start = startOfDay(new Date(rotacion.fechaInicioCiclo));
  const t = startOfDay(date);
  if (t.getTime() <= start.getTime()) return 0;
  return Math.floor((t.getTime() - start.getTime()) / (period * DAY_MS));
}

export function rotatingMemberOn(
  rotacion: RotatingTurn | undefined,
  date: Date,
): string | null {
  if (!rotacion || rotacion.miembrosTurno.length === 0) return null;
  const index = rotatingCycleIndex(rotacion, date);
  return (
    rotacion.miembrosTurno[
      (rotacion.indiceTurnoActual + index) % rotacion.miembrosTurno.length
    ] ?? null
  );
}

export function rotatingOccursOn(
  schedule: TaskSchedule,
  rotacion: RotatingTurn | undefined,
  date: Date,
): boolean {
  if (!rotacion || schedule.type === 'flexible') return false;
  const period = rotatingPeriodDays(rotacion);
  const index = rotatingCycleIndex(rotacion, date);

  if (schedule.type === 'once') {
    const shifted = addDays(fromDateKey(schedule.dueDate), index * period);
    return toDateKey(date) === toDateKey(shifted);
  }

  if (schedule.startDate && schedule.endDate) {
    const s = addDays(fromDateKey(schedule.startDate), index * period);
    const e = addDays(fromDateKey(schedule.endDate), index * period);
    const night = startOfDay(date);
    const key = toDateKey(night);
    return key >= toDateKey(s) && key <= toDateKey(e);
  }

  return scheduledOccursOn(schedule, date);
}

export function isScheduleFuture(
  schedule: TaskSchedule | undefined,
  todayKey: string,
): boolean {
  if (!schedule) return false;
  if (schedule.type === 'scheduled' && schedule.startDate) {
    return schedule.startDate > todayKey;
  }
  if (schedule.type === 'once') {
    return schedule.dueDate > todayKey;
  }
  return false;
}

export function nextOccurrenceOnOrAfter(
  schedule: ScheduledSchedule,
  from: Date,
  inclusive: boolean,
): Date | null {
  const anchor = startOfDay(inclusive ? from : addDays(from, 1));
  const interval = schedule.repeatIntervalDays ?? 7;
  const maxDays = interval * 2 + 8;
  for (let i = 0; i <= maxDays; i++) {
    const candidate = addDays(anchor, i);
    if (scheduledOccursOn(schedule, candidate)) return candidate;
  }
  return null;
}

export function formatSchedule(schedule?: TaskSchedule): string | null {
  if (!schedule) return null;
  if (schedule.type === 'flexible') return 'Flexible';

  if (schedule.type === 'once') {
    const range = scheduleRangeKeys(schedule);
    const time = schedule.time ? ` · ${schedule.time}` : '';
    if (range) {
      return `${formatRangeLabel(range.start, range.end)}${time}`;
    }
    const date = fromDateKey(schedule.dueDate);
    const dayName = DAY_LONG_LABELS[date.getDay() as DayOfWeek];
    return `${dayName} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}${time}`;
  }

  const range = scheduleRangeKeys(schedule);
  if (range) {
    let rtime = '';
    if (schedule.time) {
      rtime = ` · ${schedule.time}`;
    } else if (schedule.timeStart && schedule.timeEnd) {
      rtime = ` · ${schedule.timeStart}-${schedule.timeEnd}`;
    }
    const rinterval = schedule.repeatIntervalDays;
    const rfreq =
      schedule.repeatWeekly || !rinterval ? '' : ` · cada ${rinterval}d`;
    return `${formatRangeLabel(range.start, range.end)}${rtime}${rfreq}`;
  }

  const days = [...schedule.days].sort((a, b) => a - b);

  let time = '';
  if (schedule.time) {
    time = ` · ${schedule.time}`;
  } else if (schedule.timeStart && schedule.timeEnd) {
    time = ` · ${schedule.timeStart}-${schedule.timeEnd}`;
  }

  const core = (() => {
    if (days.length === 7) return 'Todos los días';
    if (days.length === 1) return DAY_LABELS[days[0]];
    const consecutive = days.every((day, index) =>
      index === 0 ? true : day - days[index - 1] === 1,
    );
    if (consecutive) {
      return `${DAY_LABELS[days[0]]}-${DAY_LABELS[days[days.length - 1]]}`;
    }
    return days.map((day) => DAY_LABELS[day]).join(' · ');
  })();

  const hasRoutine =
    schedule.startDate != null ||
    (schedule.repeatIntervalDays != null && schedule.repeatIntervalDays > 0);

  if (hasRoutine) {
    const interval = schedule.repeatIntervalDays;
    const freq = interval ? `cada ${interval}d` : 'semanal';
    return `${core} · ${freq}${time}`;
  }

  return `${core}${time}`;
}