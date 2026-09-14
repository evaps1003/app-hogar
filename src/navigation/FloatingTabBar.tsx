import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useHousehold } from '../data/HouseholdContext';
import { RootTabParamList } from './types';

type RouteName = keyof RootTabParamList;

interface Tab {
  route: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}

const TABS: Tab[] = [
  { route: 'Hoy', label: 'Mis Tareas', icon: 'sunny-outline', activeIcon: 'sunny' },
  {
    route: 'Tareas',
    label: 'Reparto',
    icon: 'clipboard-outline',
    activeIcon: 'clipboard',
  },
  {
    route: 'Calendario',
    label: 'Calendario',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  {
    route: 'Compras',
    label: 'Compras',
    icon: 'cart-outline',
    activeIcon: 'cart',
  },
  {
    route: 'Ajustes',
    label: 'Ajustes',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

export function FloatingTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeMember } = useHousehold();
  const bottomPadding = Math.max(insets.bottom, 12);

  const isSupervised = activeMember?.householdRole === 'supervised';
  const visibleTabs = TABS.filter(
    (tab) => !(tab.route === 'Tareas' && isSupervised),
  );

  return (
    <View style={[styles.outer, { marginBottom: bottomPadding }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            shadowColor: theme.shadows.floating.shadowColor,
            shadowOpacity: theme.shadows.floating.shadowOpacity,
            shadowRadius: theme.shadows.floating.shadowRadius,
            shadowOffset: theme.shadows.floating.shadowOffset,
            elevation: theme.shadows.floating.elevation,
          },
        ]}
      >
        {visibleTabs.map((tab) => {
          const routeKey = tab.route as RouteName;
          const index = state.routes.findIndex((r) => r.name === routeKey);
          const isFocused = index !== -1 && state.index === index;

          const color = isFocused
            ? theme.colors.primaryStrong
            : theme.colors.tabInactive;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(routeKey);
            }
          };

          return (
            <Pressable
              key={tab.route}
              onPress={handlePress}
              style={styles.item}
              hitSlop={8}
            >
              <View
                style={[
                  styles.iconWrap,
                  isFocused && {
                    backgroundColor: theme.colors.primarySoft,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Ionicons
                  name={isFocused ? tab.activeIcon : tab.icon}
                  size={22}
                  color={color}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color,
                    fontWeight: isFocused ? '800' : '500',
                    opacity: isFocused ? 1 : 0.85,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 70,
    paddingHorizontal: 6,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});