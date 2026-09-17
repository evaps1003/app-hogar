import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HoyScreen } from '../screens/HoyScreen';
import { TareasScreen } from '../screens/TareasScreen';
import { ComprasScreen } from '../screens/ComprasScreen';
import { AjustesScreen } from '../screens/AjustesScreen';
import { FloatingTabBar } from './FloatingTabBar';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Hoy" component={HoyScreen} />
      <Tab.Screen name="Tareas" component={TareasScreen} />
      <Tab.Screen name="Compras" component={ComprasScreen} />
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}