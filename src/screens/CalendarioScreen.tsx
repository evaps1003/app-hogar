import React from 'react';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';

export function CalendarioScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Calendario"
        subtitle="La convivencia, en el tiempo"
      />
      <EmptyState
        icon="calendar-outline"
        iconTint="accent"
        title="Nada agendado"
        message="Citas, limpiezas y eventos compartidos del hogar aparecerán aquí."
      />
    </Screen>
  );
}