import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface MeritStampProps {
  name: string;
}

export function MeritStamp({ name }: MeritStampProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.stamp,
        {
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radius.pill,
          borderWidth: 1.5,
          borderColor: theme.colors.primaryStrong,
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.colors.primaryStrong }]}>
        Hecho por {name} ✨
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    transform: [{ rotate: '-4deg' }],
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});