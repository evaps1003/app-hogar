import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { MemberAvatar } from './MemberAvatar';
import { NewListInput } from '../data/ComprasContext';
import { Member, ShoppingList } from '../data/types';
import { useTheme } from '../theme';

interface NewShoppingListSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  creatorId: string | null;
  editingList: ShoppingList | null;
  onSave: (input: NewListInput) => void;
  onDelete: (listId: string) => void;
}

export function NewShoppingListSheet({
  visible,
  onClose,
  members,
  creatorId,
  editingList,
  onSave,
  onDelete,
}: NewShoppingListSheetProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setName(editingList?.name ?? '');
    setMemberIds(editingList?.memberIds ?? members.map((m) => m.id));
  }, [visible, editingList, members]);

  const toggleMember = (memberId: string) => {
    setMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const canSave = name.trim().length > 0 && memberIds.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), memberIds });
    setName('');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editingList ? 'Editar lista' : 'Nueva lista'}
      subtitle={
        editingList
          ? 'Nombre, participantes y visibilidad'
          : 'Selecciona solo tu nombre para una lista personal'
      }
    >
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Nombre de la lista
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej. General Casa, Comida..."
        placeholderTextColor={theme.colors.tabInactive}
        returnKeyType="done"
        onSubmitEditing={handleSave}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.textPrimary,
            borderRadius: theme.radius.pill,
          },
        ]}
      />

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Miembros participantes
      </Text>
      <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
        {members.some((m) => m.id === creatorId)
          ? `Si solo seleccionas tu nombre («${members.find((m) => m.id === creatorId)?.name}»), la lista será privada.`
          : 'Si solo seleccionas tu nombre, la lista será privada.'}
      </Text>
      <View style={styles.chipsRow}>
        {members.map((member) => {
          const selected = memberIds.includes(member.id);
          return (
            <Pressable
              key={member.id}
              onPress={() => toggleMember(member.id)}
              style={[
                styles.memberChip,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryStrong
                    : theme.colors.surfaceVariant,
                },
              ]}
            >
              <MemberAvatar member={member} size={18} />
              <Text
                style={[
                  styles.memberChipText,
                  {
                    color: selected
                      ? '#FFFFFF'
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {member.name}
              </Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#FFFFFF"
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {editingList ? (
        <Pressable
          onPress={() => {
            if (editingList) {
              onDelete(editingList.id);
              onClose();
            }
          }}
          style={({ pressed }) => [
            styles.deleteButton,
            {
              backgroundColor: theme.colors.danger,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.deleteText}>Eliminar lista</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: canSave
              ? theme.colors.primaryStrong
              : theme.colors.surfaceVariant,
            transform: [{ scale: pressed && canSave ? 0.98 : 1 }],
          },
        ]}
      >
        <Text
          style={[
            styles.saveText,
            { color: canSave ? '#FFFFFF' : theme.colors.tabInactive },
          ]}
        >
          {editingList ? 'Guardar cambios' : 'Crear lista'}
        </Text>
      </Pressable>
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
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    marginTop: 24,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  saveButton: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '800',
  },
});