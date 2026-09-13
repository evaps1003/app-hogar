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
  Task,
  TaskSchedule,
  TasksStorage,
} from './types';
import { getCurrentWeekKey } from './schedule';
import { useHousehold } from './HouseholdContext';
import { useClock } from './ClockContext';

const STORAGE_KEY = 'hogar.tasks.v2';
const DAY_MS = 24 * 60 * 60 * 1000;

interface TaskActionBase {
  title: string;
  assigneeId: string | null;
  schedule?: TaskSchedule;
  rotacion?: RotatingTurn;
}

interface TasksContextValue {
  tasks: Task[];
  ready: boolean;
  addTask: (input: TaskActionBase) => void;
  toggleAssigned: (taskId: string) => void;
  claimFreeTask: (taskId: string) => void;
  reopen: (taskId: string) => void;
  canCheckTask: (task: Task) => boolean;
  advanceTurn: (taskId: string) => void;
  advanceAllTurns: () => void;
  simulateWeek: () => void;
  pendingAssigned: Task[];
  doneAssigned: Task[];
  pendingFree: Task[];
  doneFree: Task[];
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

function advanceTurnTask(task: Task): Task {
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

function applyCycleMaintenance(storage: TasksStorage, now: number): TasksStorage {
  let changed = false;
  const tasks = storage.tasks.map((task) => {
    if (!task.rotacion && !task.schedule) return task;

    let current = task;

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
      sched.repeatWeekly &&
      current.completed &&
      current.completedAt &&
      now - current.completedAt >= 7 * DAY_MS
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
  return changed ? { ...storage, tasks } : storage;
}

function applyWeekAdvance(storage: TasksStorage, now: number): TasksStorage {
  let changed = false;
  const tasks = storage.tasks.map((task) => {
    let current = task;

    if (
      current.schedule?.type === 'scheduled' &&
      current.schedule.repeatWeekly &&
      current.completed
    ) {
      current = {
        ...current,
        completed: false,
        completedBy: null,
        completedAt: null,
      };
      changed = true;
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

    return current;
  });
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
              setState(applyCycleMaintenance(parsed));
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

    const addTask = (input: TaskActionBase) => {
      if (activeMember?.householdRole === 'supervised') return;
      const title = input.title.trim();
      if (!title) return;
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
      };
      setState((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, task] } : prev,
      );
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
      return true;
    };

    const assigned = tasks.filter(
      (t) => t.assigneeId !== null && isTaskVisible(t),
    );
    const free = tasks.filter((t) => t.assigneeId === null && isTaskVisible(t));

    const todayDay = new Date().getDay() as DayOfWeek;

    const isThisWeek = (t: Task) =>
      t.schedule?.type === 'flexible' && t.schedule.weekKey === weekKey;

    const activeId = activeMember?.id;

    const dueOn = (day: DayOfWeek) =>
      sortTasks(
        assigned.filter((t) => {
          if (t.completed || t.assigneeId !== activeId) return false;
          const s = t.schedule;
          if (!s) return day === todayDay;
          if (s.type === 'flexible') return false;
          if (!s.days.includes(day)) return false;
          if (s.repeatWeekly) return true;
          return s.weekKey === weekKey;
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