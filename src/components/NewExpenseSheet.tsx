import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from './BottomSheet';
import { MemberAvatar } from './MemberAvatar';
import { ExpenseCategory, Member } from '../data/types';
import { useTheme } from '../theme';

interface NewExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  groups: { id: string; name: string; memberIds: string[] }[];
  initialGroupId: string | null;
  categories: { id: string; name: string }[];
  onManageCategories?: () => void;
  onSave: (input: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string | null;
    category: string;
    listId: string | null;
  }) => void;
}

export function NewExpenseSheet({
  visible,
  onClose,
  members,
  groups,
  initialGroupId,
  categories,
  onManageCategories,
  onSave,
}: NewExpenseSheetProps) {
  const { theme } = useTheme();
  const [amountText, setAmountText] = useState('');
  const [paidById, setPaidById] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<ExpenseCategory>('supermercado');
  const [note, setNote] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);

  const activeGroup = groups.find((g) => g.id === groupId) ?? groups[0] ?? null;
  const activeMemberIds = activeGroup
    ? members.filter((m) => activeGroup.memberIds.includes(m.id))
    : members;

  const resetForGroup = (gid: string | null) => {
    const group =
      groups.find((g) => g.id === gid) ?? groups[0] ?? null;
    setGroupId(group?.id ?? null);
    const scope = group
      ? members.filter((m) => group.memberIds.includes(m.id))
      : members;
    setPaidById(scope[0]?.id ?? null);
    setParticipants(new Set(scope.map((m) => m.id)));
  };

  useEffect(() => {
    if (visible) {
      setAmountText('');
      resetForGroup(initialGroupId);
      setCategory('supermercado');
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialGroupId, groups]);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === category)) {
      setCategory('supermercado');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const amount = amountText.replace(',', '.');
  const parsed = Number(amount);
  const canSave =
    Number.isFinite(parsed) && parsed > 0 && paidById !== null;

  const toggleParticipant = (id: string) => {
    if (id === paidById) return;
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!canSave || paidById === null) return;
    onSave({
      amount: parsed,
      paidBy: paidById,
      participants: Array.from(participants),
      note: note.trim() ? note.trim() : null,
      category,
      listId: activeGroup?.id ?? null,
    });
    setAmountText('');
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Anotar gasto"
      subtitle="Importe, quién pagó y reparto a partes iguales"
    >
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Lista / grupo
      </Text>
      <View style={styles.chipsRow}>
        {groups.map((group) => {
          const selected = group.id === activeGroup?.id;
          return (
            <Pressable
              key={group.id}
              onPress={() => resetForGroup(group.id)}
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
                    color: selected
                      ? '#FFFFFF'
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {group.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Importe total
      </Text>
      <View style={styles.amountRow}>
        <Text style={[styles.euroSign, { color: theme.colors.textPrimary }]}>
          €
        </Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0,00"
          placeholderTextColor={theme.colors.tabInactive}
          keyboardType="decimal-pad"
          returnKeyType="done"
          style={[
            styles.amountInput,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.md,
            },
          ]}
        />
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Quién pagó
      </Text>
      <View style={styles.chipsRow}>
        {activeMemberIds.map((member) => {
          const selected = paidById === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => setPaidById(member.id)}
              style={[
                styles.memberChip,
                {
                  backgroundColor: selected
                    ? theme.colors.highlightStrong
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
                    ? theme.colors.highlightStrong
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
          style={({ pressed }) => [
            styles.editCategories,
            { transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text
            style={[
              styles.editCategoriesText,
              { color: theme.colors.accentStrong },
            ]}
          >
            ✏️ Editar categorías
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Reparto (¿a quién se reparte?
        <Text style={{ fontWeight: '400' }}> todos a partes iguales</Text>)
      </Text>
      <View style={styles.chipsRow}>
        {activeMemberIds.map((member) => {
          const selected = participants.has(member.id);
          const locked = member.id === paidById;
          return (
            <Pressable
              key={member.id}
              onPress={() => toggleParticipant(member.id)}
              style={[
                styles.memberChip,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryStrong
                    : theme.colors.surfaceVariant,
                  opacity: locked ? 1 : selected ? 1 : 0.85,
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

      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        Nota (opcional)
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Ej. Compra semanal del súper"
        placeholderTextColor={theme.colors.tabInactive}
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.textPrimary,
            borderRadius: theme.radius.pill,
          },
        ]}
      />

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: canSave
              ? theme.colors.highlightStrong
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
          Anotar gasto
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  euroSign: {
    fontSize: 22,
    fontWeight: '800',
  },
  amountInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '800',
  },
  input: {
    height: 46,
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
  editCategories: {
    alignSelf: 'flex-start',
    paddingTop: 10,
    paddingBottom: 2,
  },
  editCategoriesText: {
    fontSize: 13,
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