import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { MemberAvatar } from './MemberAvatar';
import { useHousehold } from '../data/HouseholdContext';
import { HouseholdRole, Member } from '../data/types';
import { useTheme } from '../theme';

const ROLE_OPTIONS: { key: HouseholdRole; label: string; hint: string }[] = [
  { key: 'coadmin', label: 'Co-administrador', hint: 'Puede gestionar roles y el hogar' },
  { key: 'supervised', label: 'Supervisado', hint: 'Solo lectura · ve y completa tareas' },
];

interface MemberRoleSheetProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
}

export function MemberRoleSheet({
  visible,
  member,
  onClose,
}: MemberRoleSheetProps) {
  const { theme } = useTheme();
  const { updateMemberRole } = useHousehold();

  const handleSelect = (role: HouseholdRole) => {
    if (member && role !== member.householdRole) {
      updateMemberRole(member.id, role);
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Rol del miembro"
      subtitle="Elige el rol para este miembro del hogar."
    >
      {member ? (
        <View
          style={[
            styles.memberPreview,
            { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radius.md },
          ]}
        >
          <MemberAvatar member={member} size={36} />
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: theme.colors.textPrimary }]}>
              {member.name}
            </Text>
            <Text style={[styles.previewRole, { color: theme.colors.textSecondary }]}>
              Rol actual
            </Text>
          </View>
        </View>
      ) : null}

      {ROLE_OPTIONS.map((option) => {
        const isCurrent = member?.householdRole === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => handleSelect(option.key)}
            style={({ pressed }) => [
              styles.optionRow,
              {
                backgroundColor: isCurrent
                  ? theme.colors.primarySoft
                  : theme.colors.surfaceVariant,
                borderRadius: theme.radius.md,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                {option.label}
              </Text>
              <Text style={[styles.optionHint, { color: theme.colors.textSecondary }]}>
                {option.hint}
              </Text>
            </View>
            {isCurrent && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={theme.colors.primaryStrong}
              />
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  memberPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewInfo: {
    gap: 2,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  optionInfo: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionHint: {
    fontSize: 12,
    fontWeight: '500',
  },
});