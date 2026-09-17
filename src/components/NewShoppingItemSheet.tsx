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
import { NewItemInput } from '../data/ComprasContext';
import { Member, ShoppingCategory, ShoppingItem } from '../data/types';
import { useTheme } from '../theme';

interface NewShoppingItemSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  listMembers: Member[];
  editingItem: ShoppingItem | null;
  categories: { id: string; name: string }[];
  onManageCategories?: () => void;
  onSave: (input: NewItemInput) => void;
}

export function NewShoppingItemSheet({
  visible,
  onClose,
  members,
  listMembers,
  editingItem,
  categories,
  onManageCategories,
  onSave,
}: NewShoppingItemSheetProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('basicos');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationMemberIds, setRotationMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setName(editingItem?.name ?? '');
    setCategory(editingItem?.category ?? 'basicos');
    setAssigneeId(editingItem?.assigneeId ?? null);
    setUrgent(editingItem?.urgent ?? false);
    setRotationEnabled(!!editingItem?.rotation);
    setRotationMemberIds(editingItem?.rotation?.memberIds ?? []);
  }, [visible, editingItem]);

  const canSave = name.trim().length > 0;

  const showRotation = category === 'basicos';

  const toggleRotationMember = (memberId: string) => {
    setRotationMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const enableRotation = () => {
    setRotationEnabled(true);
    setRotationMemberIds(listMembers.map((m) => m.id));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      category,
      assigneeId,
      urgent,
      rotation:
        showRotation && rotationEnabled && rotationMemberIds.length > 0
          ? {
              memberIds: rotationMemberIds,
              currentIndex: editingItem?.rotation
                ? editingItem.rotation.currentIndex % rotationMemberIds.length
                : 0,
            }
          : null,
    });
    setName('');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editingItem ? 'Editar artículo' : 'Añadir artículo'}
      subtitle="Nombre, categoría y quien lo compra"
    >
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Artículo
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej. Leche, papel de cocina..."
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
        Categoría
      </Text>
      <View style={styles.chipsRow}>
        {categories.map((option) => {
          const selected = category === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setCategory(option.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryStrong
                    : theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected
                      ? '#FFFFFF'
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {onManageCategories ? (
        <Pressable
          onPress={onManageCategories}
          style={styles.editCategories}
        >
          <Text
            style={[styles.editCategoriesText, { color: theme.colors.textSecondary }]}
          >
            ✏️ Editar categorías
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Urgente / Importante
      </Text>
      <Pressable
        onPress={() => setUrgent((v) => !v)}
        style={[
          styles.urgentToggle,
          {
            backgroundColor: urgent
              ? theme.colors.warningStrong
              : theme.colors.surfaceVariant,
          },
        ]}
      >
        <Ionicons
          name={urgent ? 'notifications' : 'notifications-outline'}
          size={18}
          color={urgent ? '#FFFFFF' : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.urgentToggleText,
            { color: urgent ? '#FFFFFF' : theme.colors.textSecondary },
          ]}
        >
          {urgent ? 'Urgente (se verá en la Bolsa Común)' : 'Marcar como urgente'}
        </Text>
      </Pressable>

      {showRotation ? (
        <>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
            Rueda de turnos
          </Text>
          <Pressable
            onPress={() =>
              rotationEnabled
                ? setRotationEnabled(false)
                : enableRotation()
            }
            style={[
              styles.urgentToggle,
              {
                backgroundColor: rotationEnabled
                  ? theme.colors.accentStrong
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Ionicons
              name={rotationEnabled ? 'sync' : 'sync-outline'}
              size={18}
              color={rotationEnabled ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.urgentToggleText,
                {
                  color: rotationEnabled
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {rotationEnabled
                ? 'Turnos rotativos activados'
                : 'Activar turnos para reponer'}
            </Text>
          </Pressable>

          {rotationEnabled ? (
            <>
              <Text
                style={[
                  styles.fieldHint,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Quién compra y marca el artículo avanza la rueda al siguiente
                miembro.
              </Text>
              <View style={styles.chipsRow}>
                {listMembers.length === 0 ? (
                  <Text
                    style={[
                      styles.fieldHint,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Esta lista no tiene miembros todavía.
                  </Text>
                ) : (
                  listMembers.map((member) => {
                    const selected = rotationMemberIds.includes(member.id);
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => toggleRotationMember(member.id)}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor: selected
                              ? theme.colors.accentStrong
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
                  })
                )}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Responsable (opcional)
      </Text>
      <View style={styles.chipsRow}>
        <Pressable
          onPress={() => setAssigneeId(null)}
          style={[
            styles.memberChip,
            {
              backgroundColor:
                assigneeId === null
                  ? theme.colors.primaryStrong
                  : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Text
            style={[
              styles.memberChipText,
              {
                color:
                  assigneeId === null
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
              },
            ]}
          >
            Cualquiera
          </Text>
        </Pressable>
        {members.map((member) => {
          const selected = assigneeId === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => setAssigneeId(member.id)}
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
            </Pressable>
          );
        })}
      </View>

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
          {editingItem ? 'Guardar cambios' : 'Añadir a la lista'}
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
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editCategories: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  editCategoriesText: {
    fontSize: 13,
    fontWeight: '600',
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  urgentToggleText: {
    fontSize: 14,
    fontWeight: '700',
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