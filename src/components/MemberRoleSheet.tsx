import React, { useEffect, useState } from 'react';
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
  const { updateMemberRole, removeMember, activeMember, members } =
    useHousehold();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) setConfirming(false);
  }, [visible, member?.id]);

  const isLeader = activeMember?.householdRole === 'leader';
  const leaderCount = members.filter(
    (m) => m.householdRole === 'leader',
  ).length;
  const canExpel =
    isLeader &&
    member !== null &&
    member.id !== activeMember?.id &&
    !(member.householdRole === 'leader' && leaderCount <= 1);

  const handleSelect = (role: HouseholdRole) => {
    if (member && role !== member.householdRole) {
      updateMemberRole(member.id, role);
    }
    onClose();
  };

  const handleExpel = () => {
    if (member) removeMember(member.id);
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

      {canExpel ? (
        confirming ? (
          <View
            style={[
              styles.confirmBox,
              {
                backgroundColor: theme.colors.warningSoft,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text style={[styles.confirmText, { color: theme.colors.textPrimary }]}>
              ¿Expulsar a {member?.name} del hogar?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.pill,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[styles.confirmBtnText, { color: theme.colors.textSecondary }]}
                >
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleExpel}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    backgroundColor: theme.colors.danger,
                    borderRadius: theme.radius.pill,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                  Expulsar
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            style={({ pressed }) => [
              styles.expelRow,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.radius.md,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name="person-remove-outline"
              size={18}
              color={theme.colors.danger}
            />
            <Text style={[styles.expelText, { color: theme.colors.danger }]}>
              Expulsar del hogar
            </Text>
          </Pressable>
        )
      ) : null}
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
  expelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 4,
  },
  expelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBox: {
    padding: 14,
    marginTop: 4,
    gap: 12,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmBtn: {
    paddingHorizontal: 18,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});