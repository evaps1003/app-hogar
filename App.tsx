import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useNavigationTheme, useTheme } from './src/theme';
import { ClockProvider } from './src/data/ClockContext';
import {
  HouseholdProvider,
  useHousehold,
} from './src/data/HouseholdContext';
import { ComprasProvider } from './src/data/ComprasContext';
import { TasksProvider } from './src/data/TaskContext';
import { SyncProvider } from './src/data/SyncContext';
import { DevToolsProvider } from './src/data/DevToolsContext';
import { WelcomeScreen } from './src/components/WelcomeScreen';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppShell() {
  const { theme } = useTheme();
  const navigationTheme = useNavigationTheme();
  const { ready, deviceReady, deviceMemberId, members, joinRequested } =
    useHousehold();
  const [onboarded, setOnboarded] = useState(false);

  if (!ready || !deviceReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <ActivityIndicator color={theme.colors.primaryStrong} size="large" />
      </View>
    );
  }

  const deviceMemberExists =
    deviceMemberId !== null &&
    members.some((member) => member.id === deviceMemberId);

  const showWelcome = !onboarded && (joinRequested || !deviceMemberExists);

  if (showWelcome) {
    const mode = joinRequested || members.length > 0 ? 'join' : 'create';
    return (
      <>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <WelcomeScreen mode={mode} onDone={() => setOnboarded(true)} />
      </>
    );
  }

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
                <SyncProvider>
                  <DevToolsProvider>
                    <AppShell />
                  </DevToolsProvider>
                </SyncProvider>
              </ComprasProvider>
            </TasksProvider>
          </HouseholdProvider>
        </ClockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}