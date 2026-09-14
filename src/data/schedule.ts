import { DayOfWeek, TaskSchedule } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

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

export function formatSchedule(schedule?: TaskSchedule): string | null {
  if (!schedule) return null;
  if (schedule.type === 'flexible') return 'Flexible';
  if (schedule.type === 'once') {
    const date = fromDateKey(schedule.dueDate);
    const dayName = DAY_LONG_LABELS[date.getDay() as DayOfWeek];
    const time = schedule.time ? ` · ${schedule.time}` : '';
    return `${dayName} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}${time}`;
  }

  const days = [...schedule.days].sort((a, b) => a - b);

  let time = '';
  if (schedule.time) {
    time = ` · ${schedule.time}`;
  } else if (schedule.timeStart && schedule.timeEnd) {
    time = ` · ${schedule.timeStart}-${schedule.timeEnd}`;
  }

  if (days.length === 7) return `Todos los días${time}`;

  if (days.length === 1) {
    return `${DAY_LABELS[days[0]]}${time}`;
  }

  const consecutive = days.every((day, index) =>
    index === 0 ? true : day - days[index - 1] === 1,
  );

  if (consecutive) {
    return `${DAY_LABELS[days[0]]}-${DAY_LABELS[days[days.length - 1]]}${time}`;
  }

  return `${days.map((day) => DAY_LABELS[day]).join(' · ')}${time}`;
}