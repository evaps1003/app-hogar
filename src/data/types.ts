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
  startDate?: string;
  endDate?: string;
  repeatIntervalDays?: number;
}

export interface FlexibleSchedule {
  type: 'flexible';
  weekKey: string;
}

export interface OnceSchedule {
  type: 'once';
  dueDate: string;
  endDate?: string;
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
  urgent?: boolean;
}

export type NoticeDuration = 'hours' | 'today' | 'week' | 'never';

export interface NoticeInput {
  text: string;
  duration: NoticeDuration;
  hours?: number;
}

export interface HouseNotice {
  id: string;
  text: string;
  createdBy: string | null;
  createdAt: number;
  duration: NoticeDuration;
  hours?: number;
  expiresAt: number | null;
}

export interface HouseData {
  members: Member[];
  activeMemberId: string | null;
  categories?: string[];
  householdName?: string;
  notices?: HouseNotice[];
}

export interface TasksStorage {
  tasks: Task[];
}

export type ShoppingCategory = string;

export type CategoryTone =
  | 'primary'
  | 'highlight'
  | 'accent'
  | 'info'
  | 'warning';

export interface ShoppingCategoryConfig {
  id: string;
  name: string;
  tone: CategoryTone;
  builtin?: boolean;
}

export type ExpenseCategory = string;

export interface ExpenseCategoryConfig {
  id: string;
  name: string;
  tone: CategoryTone;
  builtin?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  memberIds: string[];
  personal: boolean;
  creatorId: string | null;
  createdAt: number;
}

export interface ShoppingRotation {
  memberIds: string[];
  currentIndex: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  listId: string;
  assigneeId: string | null;
  checked: boolean;
  createdBy: string | null;
  createdAt: number;
  checkedAt: number | null;
  urgent?: boolean;
  urgentTaskId?: string | null;
  rotation?: ShoppingRotation | null;
}

export interface GroceryExpense {
  id: string;
  amount: number;
  paidBy: string;
  participants: string[];
  note: string | null;
  category: ExpenseCategory;
  date: string;
  createdAt: number;
  listId?: string;
}

export interface ShoppingStorage {
  lists: ShoppingList[];
  items: ShoppingItem[];
  expenses: GroceryExpense[];
  settledByList: Record<string, number | null>;
  categories: ShoppingCategoryConfig[];
  expenseCategories: ExpenseCategoryConfig[];
}