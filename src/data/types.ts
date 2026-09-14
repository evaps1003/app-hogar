export type MemberColor = 'primary' | 'highlight' | 'accent';

export type HouseholdRole = 'leader' | 'coadmin' | 'supervised';

export interface Member {
  id: string;
  name: string;
  color: MemberColor;
  householdRole: HouseholdRole;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduledSchedule {
  type: 'scheduled';
  days: DayOfWeek[];
  time: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  repeatWeekly: boolean;
  weekKey?: string;
}

export interface FlexibleSchedule {
  type: 'flexible';
  weekKey: string;
}

export interface OnceSchedule {
  type: 'once';
  dueDate: string;
  time?: string | null;
}

export type TaskSchedule = ScheduledSchedule | FlexibleSchedule | OnceSchedule;

export interface RotatingTurn {
  esRotativa: boolean;
  miembrosTurno: string[];
  indiceTurnoActual: number;
  frecuenciaRotacion: number;
  fechaInicioCiclo: number;
  proximaRotacion: number;
}

export type TaskCategory = 'limpieza' | 'cocina' | 'otros' | (string & {});

export interface Task {
  id: string;
  title: string;
  assigneeId: string | null;
  completed: boolean;
  completedBy: string | null;
  createdAt: number;
  completedAt: number | null;
  schedule?: TaskSchedule;
  rotacion?: RotatingTurn;
  enSubasta?: boolean;
  category?: TaskCategory;
}

export interface HouseData {
  members: Member[];
  activeMemberId: string | null;
  categories?: string[];
}

export interface TasksStorage {
  tasks: Task[];
}