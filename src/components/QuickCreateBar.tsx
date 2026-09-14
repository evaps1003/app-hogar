import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member, TaskCategory } from '../data/types';
import { useTheme } from '../theme';
import { MemberAvatar } from './MemberAvatar';

const CATEGORIES: { key: TaskCategory; label: string; icon: string }[] = [
  { key: 'limpieza', label: 'Limpieza', icon: 'sparkles-outline' },
  { key: 'cocina', label: 'Cocina', icon: 'restaurant-outline' },
  { key: 'otros', label: 'Otros', icon: 'apps-outline' },
];

interface QuickCreateBarProps {
  members: Member[];
  onCreate: (
    title: string,
    assigneeId: string | null,
    category: TaskCategory,
  ) => void;
}

export function QuickCreateBar({ members, onCreate }: QuickCreateBarProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [category, setCategory] = useState<TaskCategory>('otros');

  const canAdd = title.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onCreate(title.trim(), assigneeId, category);
    setTitle('');
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 20,
        },
      ]}
    >
      <View style={styles.inputRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Nueva tarea..."
          placeholderTextColor={theme.colors.tabInactive}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: canAdd
                ? theme.colors.primaryStrong
                : theme.colors.surface,
              transform: [{ scale: pressed && canAdd ? 0.92 : 1 }],
            },
          ]}
        >
          <Ionicons
            name="add"
            size={20}
            color={canAdd ? '#FFFFFF' : theme.colors.tabInactive}
          />
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        <Pressable
          onPress={() => setAssigneeId(null)}
          style={[
            styles.chip,
            {
              backgroundColor:
                assigneeId === null
                  ? theme.colors.primaryStrong
                  : theme.colors.surface,
            },
          ]}
        >
          <Ionicons
            name="bag-handle-outline"
            size={13}
            color={
              assigneeId === null ? '#FFFFFF' : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.chipText,
              {
                color:
                  assigneeId === null
                    ? '#FFFFFF'
                    : theme.colors.textSecondary,
              },
            ]}
          >
            Común
          </Text>
        </Pressable>
        {members.map((member) => {
          const selected = assigneeId === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => setAssigneeId(member.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.primaryStrong
                    : theme.colors.surface,
                },
              ]}
            >
              <MemberAvatar member={member} size={18} />
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
                {member.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsRow}
      >
        {CATEGORIES.map((cat) => {
          const selected = category === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => setCategory(cat.key)}
              style={[
                styles.catPill,
                {
                  backgroundColor: selected
                    ? theme.colors.infoStrong
                    : theme.colors.surface,
                },
              ]}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={selected ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.catText,
                  {
                    color: selected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontWeight: selected ? '800' : '600',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catsRow: {
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
  },
  catText: {
    fontSize: 12,
  },
});