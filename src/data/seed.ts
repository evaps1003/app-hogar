import { HouseData, TasksStorage } from './types';

const now = Date.now();
const MINUTE = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function buildSeedHouse(): HouseData {
  return {
    members: [
      {
        id: 'member-laura',
        name: 'Laura',
        color: 'primary',
        householdRole: 'leader',
      },
      {
        id: 'member-papa',
        name: 'Papá',
        color: 'accent',
        householdRole: 'coadmin',
      },
      {
        id: 'member-hermano',
        name: 'Hermano',
        color: 'highlight',
        householdRole: 'supervised',
      },
    ],
    activeMemberId: 'member-laura',
    householdName: 'Casa de los Martínez',
    notices: [
      {
        id: 'notice-silencio',
        text: 'Silencio a partir de las 23:00 · franja de estudio',
        createdBy: 'member-laura',
        createdAt: now,
        duration: 'never',
        expiresAt: null,
      },
    ],
  };
}

export function buildSeedTasks(): TasksStorage {
  return {
    tasks: [
      {
        id: 'task-basura',
        title: 'Sacar la basura',
        assigneeId: 'member-laura',
        completed: false,
        completedBy: null,
        createdAt: now - 3 * MINUTE,
        completedAt: null,
      },
      {
        id: 'task-lavavajillas',
        title: 'Cargar el lavavajillas',
        assigneeId: 'member-papa',
        completed: false,
        completedBy: null,
        createdAt: now - 3 * MINUTE,
        completedAt: null,
      },
      {
        id: 'task-encimera',
        title: 'Limpiar la encimera',
        assigneeId: 'member-hermano',
        completed: false,
        completedBy: null,
        createdAt: now - 3 * MINUTE,
        completedAt: null,
      },
      {
        id: 'task-regar',
        title: 'Regar las plantas',
        assigneeId: null,
        completed: false,
        completedBy: null,
        createdAt: now - 2 * MINUTE,
        completedAt: null,
      },
      {
        id: 'task-carton',
        title: 'Bajar el cartón',
        assigneeId: null,
        completed: false,
        completedBy: null,
        createdAt: now - 2 * MINUTE,
        completedAt: null,
      },
      {
        id: 'task-cocina',
        title: 'Limpiar la cocina',
        assigneeId: 'member-laura',
        completed: false,
        completedBy: null,
        createdAt: now - 2 * MINUTE,
        completedAt: null,
        rotacion: {
          esRotativa: true,
          miembrosTurno: ['member-laura', 'member-papa', 'member-hermano'],
          indiceTurnoActual: 0,
          frecuenciaRotacion: 7,
          fechaInicioCiclo: now,
          proximaRotacion: now + 7 * DAY_MS,
        },
      },
    ],
  };
}