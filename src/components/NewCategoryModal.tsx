import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';
import { useTheme } from '../theme';

interface NewCategoryModalProps {
  visible: boolean;
  existing: string[];
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function NewCategoryModal({
  visible,
  existing,
  onClose,
  onCreate,
}: NewCategoryModalProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const trimmed = name.trim();
  const alreadyExists = existing.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !alreadyExists;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate(trimmed);
    setName('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nueva categoría"
      subtitle="Se añadirá al reparto de Tareas y al crear tareas."
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej.: Mascotas, Ropa, Terraza"
        placeholderTextColor={theme.colors.tabInactive}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreate}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.textPrimary,
            borderRadius: theme.radius.md,
          },
        ]}
      />
      {alreadyExists ? (
        <Text style={[styles.warning, { color: theme.colors.warningStrong }]}>
          Esta categoría ya existe.
        </Text>
      ) : null}
      <View style={styles.actions}>
        <PillButton label="Cancelar" variant="ghost" onPress={onClose} />
        <PillButton
          label="Crear categoría"
          variant="strong"
          onPress={handleCreate}
          disabled={!canCreate}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '600',
  },
  warning: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 24,
  },
});