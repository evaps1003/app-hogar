import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';

export interface CategoryRow {
  id: string;
  name: string;
  tone: string;
  builtin?: boolean;
}

interface GestionarCategoriasSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  newLabel?: string;
  categories: CategoryRow[];
  toneColors: Record<string, string>;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function GestionarCategoriasSheet({
  visible,
  onClose,
  title = 'Gestionar categorías',
  subtitle = 'Crear, renombrar o eliminar categorías',
  placeholder = 'Ej. Mascotas, Farmacia...',
  newLabel = 'Nueva categoría',
  categories,
  toneColors,
  onAdd,
  onRename,
  onDelete,
}: GestionarCategoriasSheetProps) {
  const { theme } = useTheme();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setNewName('');
      setEditingId(null);
      setEditingName('');
    }
  }, [visible]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName('');
  };

  const startRename = (cat: CategoryRow) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const commitRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== categories.find((c) => c.id === id)?.name) {
      onRename(id, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        {newLabel}
      </Text>
      <View style={styles.addRow}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.tabInactive}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          style={[
            styles.addInput,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: theme.colors.primaryStrong,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Categorías activas
      </Text>
      {categories.map((cat) => {
        const color =
          theme.colors[toneColors[cat.tone] as keyof Palette] ??
          theme.colors.textSecondary;
        return (
          <View key={cat.id} style={styles.catRow}>
            <View style={[styles.catDot, { backgroundColor: color }]} />
            {editingId === cat.id ? (
              <TextInput
                autoFocus
                value={editingName}
                onChangeText={setEditingName}
                onBlur={() => commitRename(cat.id)}
                onSubmitEditing={() => commitRename(cat.id)}
                style={[
                  styles.catNameInput,
                  {
                    color: theme.colors.textPrimary,
                    borderBottomColor: theme.colors.primaryStrong,
                  },
                ]}
              />
            ) : (
              <Pressable
                onPress={() => startRename(cat)}
                style={styles.catNameWrap}
              >
                <Text
                  style={[
                    styles.catName,
                    { color: theme.colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
                {cat.builtin ? (
                  <Text style={[styles.builtInHint, { color: theme.colors.textSecondary }]}>
                    integrada
                  </Text>
                ) : null}
              </Pressable>
            )}
            {!cat.builtin ? (
              <Pressable
                onPress={() => onDelete(cat.id)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { transform: [{ scale: pressed ? 0.85 : 1 }] },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.danger}
                />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catNameWrap: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  builtInHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  catNameInput: {
    flex: 1,
    height: 34,
    paddingHorizontal: 6,
    fontSize: 14,
    fontWeight: '600',
    borderBottomWidth: 1,
  },
  deleteBtn: {
    padding: 4,
  },
});
