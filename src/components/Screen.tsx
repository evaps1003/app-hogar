import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  overlay?: React.ReactNode;
}

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  overlay,
}: ScreenProps) {
  const { theme } = useTheme();

  const base = {
    backgroundColor: theme.colors.background,
  };

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.flex, base]} edges={['top', 'left', 'right']}>
        <View style={[styles.flex, styles.content, contentContainerStyle]}>
          {children}
        </View>
        {overlay ? (
          <View style={styles.overlay} pointerEvents="box-none">
            {overlay}
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, base]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, styles.scroll, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {overlay ? (
        <View style={styles.overlay} pointerEvents="box-none">
          {overlay}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  scroll: {
    paddingBottom: 140,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});