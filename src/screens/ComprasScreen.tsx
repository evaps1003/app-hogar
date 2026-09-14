import React from 'react';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';

export function ComprasScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Compras"
        subtitle="Lista de la compra compartida"
      />
      <EmptyState
        icon="cart-outline"
        iconTint="highlight"
        title="Carrito vacío"
        message="Añadid productos a la lista y cada quien marcará lo que haya comprado."
      />
    </Screen>
  );
}