import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useNavigationTheme, useTheme } from './src/theme';
import { ClockProvider } from './src/data/ClockContext';
import { HouseholdProvider } from './src/data/HouseholdContext';
import { ComprasProvider } from './src/data/ComprasContext';
import { TasksProvider } from './src/data/TaskContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppShell() {
  const { theme } = useTheme();
  const navigationTheme = useNavigationTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ClockProvider>
          <HouseholdProvider>
            <TasksProvider>
              <ComprasProvider>
                <AppShell />
              </ComprasProvider>
            </TasksProvider>
          </HouseholdProvider>
        </ClockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}