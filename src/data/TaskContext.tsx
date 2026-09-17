import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSeedTasks } from './seed';
import {
  DayOfWeek,
  RotatingTurn,
  ScheduledSchedule,
  Task,
  TaskCategory,
  TaskSchedule,
  TasksStorage,
} from './types';
import { getCurrentWeekKey, toDateKey, fromDateKey, startOfWeek, addDays, dateInWeekMonday, scheduledOccursOn, nextOccurrenceOnOrAfter } from './schedule';
import { useHousehold } from './HouseholdContext';
import { useClock } from './ClockContext';

const STORAGE_KEY = 'hogar.tasks.v2';
const DAY_MS = 24 * 60 * 60 * 1000;

interface TaskActionBase {
  title: string;
  assigneeId: string | null;
  schedule?: TaskSchedule;
  rotacion?: RotatingTurn;
  category?: TaskCategory;
  urgent?: boolean;
}

interface TasksContextValue {
  tasks: Task[];
  ready: boolean;
  addTask: (input: TaskActionBase) => Task | undefined;
  toggleAssigned: (taskId: string) => void;
  claimFreeTask: (taskId: string) => void;
  reopen: (taskId: string) => void;
  canCheckTask: (task: Task) => boolean;
  advanceTurn: (taskId: string) => void;
  advanceAllTurns: () => void;
  pendingAssigned: Task[];
  doneAssigned: Task[];
  pendingFree: Task[];
  doneFree: Task[];
  swapRequests: Task[];
  requestSwap: (taskId: string) => void;
  assumeTask: (taskId: string) => void;
  assignTask: (taskId: string, assigneeId: string | null) => void;
  updateTask: (taskId: string, input: TaskActionBase) => void;
  deleteTask: (taskId: string) => void;
  dueOn: (day: DayOfWeek) => Task[];
  thisWeek: Task[];
  doneThisWeek: Task[];
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.completed && b.completed) {
      return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    }
    return a.createdAt - b.createdAt;
  });
}

function advanceRangeCycle(task: Task): Task {
  const schedule = task.schedule;
  if (
    !schedule ||
    schedule.type !== 'scheduled' ||
    !schedule.startDate ||
    !schedule.endDate
  ) {
    return task;
  }
  const interval =
    schedule.repeatIntervalDays && schedule.repeatIntervalDays > 0
      ? schedule.repeatIntervalDays
      : 7;
  const spanMs =
    fromDateKey(schedule.endDate).getTime() -
    fromDateKey(schedule.startDate).getTime();
  const nextStart = addDays(fromDateKey(schedule.startDate), interval);
  const next: Task = {
    ...task,
    schedule: {
      ...schedule,
      startDate: toDateKey(nextStart),
      endDate: toDateKey(new Date(nextStart.getTime() + spanMs)),
    },
    completed: false,
    completedBy: null,
    completedAt: null,
  };
  const rot = next.rotacion;
  if (rot && rot.miembrosTurno.length > 0) {
    const members = rot.miembrosTurno;
    const nextIndex =
      members.length > 1
        ? (rot.indiceTurnoActual + 1) % members.length
        : rot.indiceTurnoActual;
    next.assigneeId = members[nextIndex];
    next.rotacion = {
      ...rot,
      indiceTurnoActual: nextIndex,
      fechaInicioCiclo: nextStart.getTime(),
      proximaRotacion: nextStart.getTime() + interval * DAY_MS,
    };
  }
  return next;
}

function advanceTurnTask(task: Task): Task {
  const schedule = task.schedule;
  if (
    schedule?.type === 'scheduled' &&
    schedule.startDate &&
    schedule.endDate
  ) {
    return advanceRangeCycle(task);
  }
  const rotacion = task.rotacion;
  if (!rotacion || rotacion.miembrosTurno.length === 0) return task;
  const members = rotacion.miembrosTurno;
  const nextIndex =
    members.length > 1
      ? (rotacion.indiceTurnoActual + 1) % members.length
      : rotacion.indiceTurnoActual;
  const fechaInicioCiclo = rotacion.proximaRotacion;
  return {
    ...task,
    assigneeId: members[nextIndex],
    completed: false,
    completedBy: null,
    completedAt: null,
    rotacion: {
      ...rotacion,
      indiceTurnoActual: nextIndex,
      fechaInicioCiclo,
      proximaRotacion: fechaInicioCiclo + rotacion.frecuenciaRotacion * DAY_MS,
    },
  };
}

function shouldReopenRoutine(
  schedule: ScheduledSchedule,
  completedAt: number,
  now: number,
): boolean {
  if (schedule.startDate && schedule.repeatIntervalDays && schedule.repeatIntervalDays > 0) {
    const completedDay = fromDateKey(toDateKey(new Date(completedAt)));
    const next = nextOccurrenceOnOrAfter(schedule, completedDay, false);
    if (!next) return false;
    const today = fromDateKey(toDateKey(new Date(now)));
    return today.getTime() >= next.getTime();
  }
  return (
    schedule.repeatWeekly && now - completedAt >= 7 * DAY_MS
  );
}

function applyCycleMaintenance(storage: TasksStorage, now: number): TasksStorage {
  let changed = false;
  const currentWeek = getCurrentWeekKey();
  const weekStart = toDateKey(startOfWeek(new Date(now)));
  const tasks = storage.tasks
    .filter((task) => {
      if (!task.completed) return true;
      const s = task.schedule;
      if (!s) return true;
      if (s.type === 'once') {
        const end = s.endDate ?? s.dueDate;
        return end >= weekStart;
      }
      if (s.type === 'scheduled' && s.repeatWeekly === false && s.weekKey) {
        return s.weekKey === currentWeek;
      }
      return true;
    })
    .map((task) => {
      if (!task.rotacion && !task.schedule) return task;

      let current = task;

      const rangeSchedule =
        current.schedule?.type === 'scheduled' &&
        !!current.schedule.startDate &&
        !!current.schedule.endDate;

      if (rangeSchedule) {
        let guard = 0;
        while (guard < 52) {
          const s = current.schedule;
          if (s?.type !== 'scheduled' || !s.startDate || !s.endDate) break;
          const interval =
            s.repeatIntervalDays && s.repeatIntervalDays > 0
              ? s.repeatIntervalDays
              : 7;
          const nextStart = addDays(fromDateKey(s.startDate), interval);
          if (now < nextStart.getTime()) break;
          current = advanceRangeCycle(current);
          changed = true;
          guard += 1;
        }
        return current;
      }

      if (current.rotacion && current.rotacion.miembrosTurno.length > 0) {
        let guard = 0;
        while (guard < 52) {
          const rot = current.rotacion;
          if (!rot || now < rot.proximaRotacion) break;
          current = advanceTurnTask(current);
          changed = true;
          guard += 1;
        }
      }

      const sched = current.schedule;
      if (
        sched?.type === 'scheduled' &&
        !sched.endDate &&
        current.completed &&
        current.completedAt &&
        shouldReopenRoutine(sched, current.completedAt, now)
      ) {
        current = {
          ...current,
          completed: false,
          completedBy: null,
          completedAt: null,
        };
        changed = true;
      }

      return current;
    });
  if (tasks.length !== storage.tasks.length) changed = true;
  return changed ? { ...storage, tasks } : storage;
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { members, getMemberById, activeMember } = useHousehold();
  const { now, advanceWeek: advanceClockWeek } = useClock();

  const [state, setState] = useState<TasksStorage | null>(null);
  const [ready, setReady] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          if (raw) {
            const parsed = JSON.parse(raw) as TasksStorage;
            if (Array.isArray(parsed.tasks)) {
              const normalized: TasksStorage = {
                ...parsed,
                tasks: parsed.tasks.map((task) => {
                  if (task.urgent) return task;
                  const prefix = 'Urgente: Comprar ';
                  if (task.title.startsWith(prefix)) {
                    return {
                      ...task,
                      title: task.title.slice(prefix.length),
                      urgent: true,
                    };
                  }
                  return task;
                }),
              };
              setState(applyCycleMaintenance(normalized, Date.now()));
            } else {
              setState(buildSeedTasks());
            }
          } else {
            setState(buildSeedTasks());
          }
        }
      } catch {
        if (!cancelled) setState(buildSeedTasks());
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state || firstRender.current) {
      firstRender.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo<TasksContextValue>(() => {
    const tasks = state?.tasks ?? [];

    const addTask = (input: TaskActionBase): Task | undefined => {
      if (activeMember?.householdRole === 'supervised') return undefined;
      const title = input.title.trim();
      if (!title) return undefined;
      const rotacion = input.rotacion;
      const task: Task = {
        id: makeId('task'),
        title,
        assigneeId: rotacion
          ? rotacion.miembrosTurno[rotacion.indiceTurnoActual] ?? null
          : input.assigneeId,
        completed: false,
        completedBy: null,
        createdAt: Date.now(),
        completedAt: null,
        schedule: input.schedule,
        rotacion,
        category: input.category ?? 'otros',
        urgent: input.urgent === true,
      };
      setState((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, task] } : prev,
      );
      return task;
    };

    const patchTask = (taskId: string, patch: (task: Task) => Task) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) =>
                task.id === taskId ? patch(task) : task,
              ),
            }
          : prev,
      );
    };

    const toggleAssigned = (taskId: string) => {
      patchTask(taskId, (task) => {
        const assignee = getMemberById(task.assigneeId);
        const completed = !task.completed;
        return {
          ...task,
          completed,
          completedBy: completed ? (assignee?.name ?? 'Alguien') : null,
          completedAt: completed ? Date.now() : null,
          enSubasta: completed ? false : task.enSubasta,
        };
      });
    };

    const claimFreeTask = (taskId: string) => {
      const name = activeMember?.name ?? 'Alguien';
      patchTask(taskId, (task) => ({
        ...task,
        completed: true,
        completedBy: name,
        completedAt: Date.now(),
      }));
    };

    const reopen = (taskId: string) => {
      patchTask(taskId, (task) => ({
        ...task,
        completed: false,
        completedBy: null,
        completedAt: null,
      }));
    };

    const canCheckTask = (task: Task) => {
      if (!task.assigneeId) return true;
      return task.assigneeId === activeMember?.id;
    };

    const requestSwap = (taskId: string) => {
      patchTask(taskId, (task) => {
        if (task.completed) return task;
        if (task.assigneeId !== activeMember?.id) return task;
        const already = task.enSubasta;
        return { ...task, enSubasta: !already };
      });
    };

    const assumeTask = (taskId: string) => {
      const id = activeMember?.id;
      if (!id) return;
      patchTask(taskId, (task) => {
        if (!task.enSubasta || task.completed) return task;
        if (task.assigneeId === id) return task;
        return { ...task, assigneeId: id, enSubasta: false };
      });
    };

    const assignTask = (taskId: string, assigneeId: string | null) => {
      if (activeMember?.householdRole === 'supervised') return;
      patchTask(taskId, (task) => {
        if (task.completed) return task;
        const next = { ...task, assigneeId, enSubasta: false } as Task;
        const rot = task.rotacion;
        if (rot && assigneeId) {
          const idx = rot.miembrosTurno.indexOf(assigneeId);
          if (idx !== -1) {
            next.rotacion = { ...rot, indiceTurnoActual: idx };
          }
        }
        return next;
      });
    };

    const updateTask = (taskId: string, input: TaskActionBase) => {
      if (activeMember?.householdRole === 'supervised') return;
      patchTask(taskId, (task) => {
        const next: Task = {
          ...task,
          title: input.title,
          assigneeId: input.assigneeId,
          schedule: input.schedule,
          rotacion: input.rotacion,
          category: input.category ?? task.category,
          enSubasta:
            task.enSubasta && task.assigneeId !== input.assigneeId
              ? false
              : task.enSubasta,
        };
        return next;
      });
    };

    const deleteTask = (taskId: string) => {
      if (activeMember?.householdRole === 'supervised') return;
      setState((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }
          : prev,
      );
    };

    const advanceTurn = (taskId: string) => {
      patchTask(taskId, (task) => advanceTurnTask(task));
    };

    const advanceAllTurns = () => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) => advanceTurnTask(task)),
            }
          : prev,
      );
    };

    const weekKey = getCurrentWeekKey();

    const isTaskVisible = (t: Task) => {
      const s = t.schedule;
      if (s?.type === 'scheduled' && s.repeatWeekly === false && s.weekKey) {
        return s.weekKey === weekKey;
      }
      if (s?.type === 'once') {
        const todayKey = toDateKey(new Date());
        return s.dueDate >= todayKey;
      }
      if (s?.type === 'scheduled' && s.startDate) {
        const todayKey = toDateKey(new Date());
        return s.startDate <= todayKey;
      }
      return true;
    };

    const assigned = tasks.filter(
      (t) => t.assigneeId !== null && isTaskVisible(t),
    );
    const free = tasks.filter((t) => t.assigneeId === null && isTaskVisible(t));

    const todayDay = new Date().getDay() as DayOfWeek;

    const isThisWeek = (t: Task) => {
      if (t.schedule?.type === 'flexible' && t.schedule.weekKey === weekKey) return true;
      if (t.schedule?.type === 'once') {
        const monday = startOfWeek();
        const sunday = addDays(monday, 6);
        const start = t.schedule.dueDate;
        const end = t.schedule.endDate ?? start;
        return start <= toDateKey(sunday) && end >= toDateKey(monday);
      }
      return false;
    };

    const activeId = activeMember?.id;

    const dueOn = (day: DayOfWeek) =>
      sortTasks(
        assigned.filter((t) => {
          if (t.completed || t.assigneeId !== activeId) return false;
          const s = t.schedule;
          if (!s) return day === todayDay;
          if (s.type === 'flexible') return false;
          if (s.type === 'once') {
            const weekDate = dateInWeekMonday(startOfWeek(), day);
            const key = toDateKey(weekDate);
            if (key < s.dueDate) return false;
            if (s.endDate && key > s.endDate) return false;
            const end = s.endDate ?? s.dueDate;
            const monday = startOfWeek();
            const sunday = addDays(monday, 6);
            return (
              s.dueDate <= toDateKey(sunday) &&
              end >= toDateKey(monday)
            );
          }
          if (s.type === 'scheduled') {
            const weekDate = dateInWeekMonday(startOfWeek(), day);
            return scheduledOccursOn(s, weekDate);
          }
        }),
      );

    return {
      tasks,
      ready,
      addTask,
      toggleAssigned,
      claimFreeTask,
      reopen,
      canCheckTask,
      advanceTurn,
      advanceAllTurns,
      pendingAssigned: sortTasks(assigned.filter((t) => !t.completed)),
      doneAssigned: sortTasks(assigned.filter((t) => t.completed)),
      pendingFree: sortTasks(free.filter((t) => !t.completed)),
      doneFree: sortTasks(free.filter((t) => t.completed)),
      swapRequests: sortTasks(
        assigned.filter(
          (t) =>
            !t.completed &&
            t.enSubasta &&
            t.assigneeId !== activeId,
        ),
      ),
      requestSwap,
      assumeTask,
      assignTask,
      updateTask,
      deleteTask,
      dueOn,
      thisWeek: sortTasks(
        assigned.filter(
          (t) =>
            !t.completed &&
            t.assigneeId === activeId &&
            isThisWeek(t),
        ),
      ),
      doneThisWeek: sortTasks(
        assigned.filter(
          (t) => t.completed && t.assigneeId === activeId && isThisWeek(t),
        ),
      ),
    };
  }, [state, ready, members, getMemberById, activeMember]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}