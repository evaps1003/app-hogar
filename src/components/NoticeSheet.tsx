import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';
import { useTheme } from '../theme';
import { HouseNotice, NoticeDuration, NoticeInput } from '../data/types';
import {
  NOTICE_DURATION_OPTIONS,
  NOTICE_HOUR_CHOICES,
  expiryHint,
} from '../data/notices';

interface NoticeSheetProps {
  visible: boolean;
  initial?: HouseNotice | null;
  onClose: () => void;
  onSubmit: (input: NoticeInput) => void;
}

export function NoticeSheet({
  visible,
  initial,
  onClose,
  onSubmit,
}: NoticeSheetProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [duration, setDuration] = useState<NoticeDuration>('never');
  const [hours, setHours] = useState(2);

  useEffect(() => {
    if (!visible) return;
    setText(initial?.text ?? '');
    setDuration(
      initial?.duration === 'hours' ||
        initial?.duration === 'today' ||
        initial?.duration === 'week'
        ? initial.duration
        : 'never',
    );
    setHours(initial?.hours ?? 2);
  }, [visible, initial]);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit({ text: trimmed, duration, hours });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Editar aviso' : 'Nuevo aviso'}
      subtitle="Nota de convivencia para todo el hogar."
    >
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Ej. Viene el técnico a las 11:00"
        placeholderTextColor={theme.colors.tabInactive}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.textPrimary,
            borderRadius: theme.radius.md,
          },
        ]}
      />

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Duración y caducidad
      </Text>
      <View style={styles.chipsRow}>
        {NOTICE_DURATION_OPTIONS.map((option) => {
          const selected = duration === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setDuration(option.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.highlightStrong
                    : theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected ? '#FFFFFF' : theme.colors.textPrimary,
                    fontWeight: selected ? '800' : '600',
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {duration === 'hours' ? (
        <>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
            Horas de duración
          </Text>
          <View style={styles.hoursRow}>
            {NOTICE_HOUR_CHOICES.map((h) => {
              const selected = hours === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setHours(h)}
                  style={[
                    styles.hourChip,
                    {
                      backgroundColor: selected
                        ? theme.colors.primaryStrong
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      {
                        color: selected
                          ? '#FFFFFF'
                          : theme.colors.textPrimary,
                        fontWeight: selected ? '800' : '700',
                      },
                    ]}
                  >
                    {h} h
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={[styles.expiryHint, { color: theme.colors.textSecondary }]}>
        {expiryHint(duration, hours)}
      </Text>

      <View style={styles.saveWrap}>
        <PillButton
          label="Guardar aviso"
          variant="strong"
          onPress={save}
          disabled={text.trim().length === 0}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
  },
  hoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourChip: {
    minWidth: 58,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  hourChipText: {
    fontSize: 14,
  },
  expiryHint: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
  saveWrap: {
    marginTop: 20,
  },
});