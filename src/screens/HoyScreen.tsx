import React, { useState } from 'react';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SectionDivider } from '../components/SectionDivider';
import { EmptyLine } from '../components/EmptyLine';
import { TaskRow } from '../components/TaskRow';
import { AddTaskFab } from '../components/AddTaskFab';
import { NewTaskForm } from '../components/NewTaskForm';
import { DayStrip } from '../components/DayStrip';
import { useTasks } from '../data/TaskContext';
import { useHousehold } from '../data/HouseholdContext';
import { DAY_LONG_LABELS } from '../data/schedule';
import { DayOfWeek } from '../data/types';

export function HoyScreen() {
  const {
    dueOn,
    thisWeek,
    doneThisWeek,
    pendingFree,
    doneFree,
    toggleAssigned,
    claimFreeTask,
    canCheckTask,
    reopen,
  } = useTasks();
  const { getMemberById, activeMember } = useHousehold();

  const [formVisible, setFormVisible] = useState(false);
  const todayDay = new Date().getDay() as DayOfWeek;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);

  const canCreate = activeMember?.householdRole !== 'supervised';
  const dayTasks = dueOn(selectedDay);
  const isToday = selectedDay === todayDay;
  const daySubtitle = isToday
    ? 'Tus tareas asignadas para hoy'
    : `Tus tareas asignadas para ${DAY_LONG_LABELS[selectedDay].toLowerCase()}`;

  return (
    <>
      <Screen
        overlay={
          canCreate ? <AddTaskFab onPress={() => setFormVisible(true)} /> : undefined
        }
      >
        <ScreenHeader
          title="Hoy"
          eyebrow="Inicio"
          subtitle="Tu parte del día resumida"
        />

        <DayStrip selected={selectedDay} onSelect={setSelectedDay} />

        <SectionCard title="Toca hoy" subtitle={daySubtitle}>
          {dayTasks.length === 0 ? (
            <EmptyLine message="Sin tareas para este día ✨" />
          ) : (
            dayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                assignee={getMemberById(task.assigneeId)}
                onPressCheck={() => toggleAssigned(task.id)}
                locked={!canCheckTask(task)}
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Esta semana"
          subtitle="Tus tareas flexibles a completar cuando puedas"
        >
          {thisWeek.length === 0 && doneThisWeek.length === 0 ? (
            <EmptyLine message="Sin tareas flexibles esta semana" />
          ) : (
            <>
              {thisWeek.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assignee={getMemberById(task.assigneeId)}
                  onPressCheck={() => toggleAssigned(task.id)}
                  locked={!canCheckTask(task)}
                />
              ))}
              {doneThisWeek.length > 0 ? (
                <>
                  <SectionDivider label="Completadas esta semana" />
                  {doneThisWeek.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      assignee={getMemberById(task.assigneeId)}
                      onPressCheck={() => toggleAssigned(task.id)}
                      locked={!canCheckTask(task)}
                      muted
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Bolsa común"
          subtitle="Libres para quien las tome hoy"
        >
          {pendingFree.length === 0 && doneFree.length === 0 ? (
            <EmptyLine message="La bolsa está vacía. ¡Bien!" />
          ) : (
            <>
              {pendingFree.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onPressCheck={() => claimFreeTask(task.id)}
                />
              ))}
              {doneFree.length > 0 ? (
                <>
                  <SectionDivider label="Con sello" />
                  {doneFree.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onPressCheck={() => reopen(task.id)}
                      muted
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </SectionCard>
      </Screen>

      <NewTaskForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
      />
    </>
  );
}