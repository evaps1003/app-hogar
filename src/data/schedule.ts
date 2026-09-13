import { DayOfWeek, TaskSchedule } from './types';

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

export function formatSchedule(schedule?: TaskSchedule): string | null {
  if (!schedule) return null;
  if (schedule.type === 'flexible') return 'Esta semana';

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