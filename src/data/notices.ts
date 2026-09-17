import { NoticeDuration } from './types';

export const NOTICE_DURATION_OPTIONS: { key: NoticeDuration; label: string }[] = [
  { key: 'hours', label: 'Unas horas' },
  { key: 'today', label: 'Solo hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'never', label: 'Sin caducidad' },
];

export const NOTICE_HOUR_CHOICES = [2, 4, 8, 12];

const HOUR_MS = 60 * 60 * 1000;

export function computeNoticeExpiry(
  duration: NoticeDuration,
  hours = 2,
): number | null {
  switch (duration) {
    case 'hours':
      return Date.now() + hours * HOUR_MS;
    case 'today': {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    }
    case 'week': {
      const d = new Date();
      const offset = d.getDay() === 0 ? 6 : 7 - d.getDay();
      d.setDate(d.getDate() + offset);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    }
    case 'never':
    default:
      return null;
  }
}

export function isNoticeExpired(
  notice: { expiresAt?: number | null },
  now = Date.now(),
): boolean {
  return (
    notice.expiresAt !== null &&
    notice.expiresAt !== undefined &&
    notice.expiresAt <= now
  );
}

export function noticeExpiryLabel(notice: {
  duration?: NoticeDuration;
  hours?: number;
  expiresAt?: number | null;
}): string {
  if (notice.expiresAt == null || notice.duration === 'never') {
    return 'Sin caducidad';
  }
  switch (notice.duration) {
    case 'hours':
      return notice.hours != null
        ? `Caduca en ${notice.hours} h`
        : 'Caduca en unas horas';
    case 'today':
      return 'Caduca hoy a las 23:59';
    case 'week':
      return 'Caduca el domingo a las 23:59';
    default:
      return 'Con caducidad';
  }
}

export function expiryHint(duration: NoticeDuration, hours = 2): string {
  switch (duration) {
    case 'hours':
      return `Duración: ${hours} h`;
    case 'today':
      return 'Caduca hoy a las 23:59';
    case 'week':
      return 'Caduca el domingo a las 23:59';
    case 'never':
    default:
      return 'Sin caducidad · hasta que alguien la borre';
  }
}