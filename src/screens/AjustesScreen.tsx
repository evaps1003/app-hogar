import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { MemberAvatar } from '../components/MemberAvatar';
import { MemberRoleSheet } from '../components/MemberRoleSheet';
import { NoticeToast } from '../components/NoticeToast';
import { PillButton } from '../components/PillButton';
import { useHousehold } from '../data/HouseholdContext';
import { useTasks } from '../data/TaskContext';
import { HouseholdRole, Member } from '../data/types';
import { useTheme, buildTheme } from '../theme';
import { PALETTES } from '../theme/palettes';

const ROLE_LABELS: Record<HouseholdRole, string> = {
  leader: 'Líder',
  coadmin: 'Co-admin',
  supervised: 'Supervisado',
};

export function AjustesScreen() {
  const { theme, setPaletteById } = useTheme();
  const { members, activeMember, setActiveMember, getMemberById } =
    useHousehold();
  const { tasks, advanceAllTurns } = useTasks();
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = activeMember?.householdRole !== 'supervised';
  const rotatingTasks = tasks.filter((t) => t.rotacion);

  return (
    <Screen
      overlay={
        <NoticeToast message={toast} onDone={() => setToast(null)} />
      }
    >
      <ScreenHeader
        title="Ajustes"
        eyebrow="App"
        subtitle="Tema, hogar y miembros"
      />

      <SectionCard
        title="Miembros del hogar"
        subtitle={`${members.length} persona${members.length === 1 ? '' : 's'} en la casa`}
      >
        {members.map((member) => (
          <Pressable
            key={member.id}
            disabled={!canManage}
            onPress={() => setRoleTarget(member)}
            style={({ pressed }) => [
              styles.memberRow,
              canManage && pressed && { opacity: 0.7 },
            ]}
          >
            <MemberAvatar member={member} size={36} />
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.colors.textPrimary }]}>
                {member.name}
              </Text>
              <Text style={[styles.memberRole, { color: theme.colors.textSecondary }]}>
                {ROLE_LABELS[member.householdRole]}
              </Text>
            </View>
            {member.id === activeMember?.id ? (
              <View
                style={[
                  styles.activePill,
                  { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Text
                  style={[
                    styles.activePillText,
                    { color: theme.colors.accentStrong },
                  ]}
                >
                  Eres tú
                </Text>
              </View>
            ) : null}
            {canManage ? (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.tabInactive}
              />
            ) : null}
          </Pressable>
        ))}

        {canManage ? (
          <Pressable
            onPress={() =>
              setToast('🔗 Enlace de invitación copiado al portapapeles')
            }
            style={({ pressed }) => [
              styles.invitePill,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.radius.md,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="link"
              size={18}
              color={theme.colors.primaryStrong}
            />
            <Text style={[styles.inviteText, { color: theme.colors.primaryStrong }]}>
              Invitar al hogar
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.readOnlyHint, { color: theme.colors.textSecondary }]}>
            Los invitados se suman desde alguien con permisos de gestión.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Paleta de tema">
        <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
          Los colores provienen de los tokens de diseño. Toca para activar.
        </Text>
        <View style={styles.paletteRow}>
          {PALETTES.map((palette) => {
            const isActive = palette.id === theme.colors.id;
            const preview = buildTheme(palette);
            return (
              <Pressable
                key={palette.id}
                onPress={() => setPaletteById(palette.id)}
                style={[
                  styles.paletteCard,
                  {
                    backgroundColor: palette.surfaceVariant,
                    borderWidth: 2,
                    borderColor: isActive
                      ? theme.colors.primaryStrong
                      : 'transparent',
                  },
                ]}
              >
                <View style={styles.swatches}>
                  {[palette.primary, palette.highlight, palette.accent].map(
                    (color, index) => (
                      <View
                        key={index}
                        style={[
                          styles.swatch,
                          { backgroundColor: color },
                          {
                            borderColor: palette.divider,
                            borderWidth: StyleSheet.hairlineWidth,
                          },
                        ]}
                      />
                    ),
                  )}
                </View>
                <Text
                  style={[
                    styles.paletteName,
                    { color: preview.colors.textPrimary },
                  ]}
                >
                  {palette.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard
        title="Usuario activo"
        subtitle="Herramienta de prueba · simula quién usa la app ahora"
      >
        <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
          Solo la persona asignada puede tachar su tarea; las de la bolsa común
          valen para cualquiera.
        </Text>
        <View style={[styles.chipsRow, { marginTop: 12 }]}>
          {members.map((member) => {
            const isActive = member.id === activeMember?.id;
            return (
              <Pressable
                key={member.id}
                onPress={() => setActiveMember(member.id)}
                style={[
                  styles.userChip,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primarySoft
                      : theme.colors.surfaceVariant,
                    borderWidth: 1.5,
                    borderColor: isActive
                      ? theme.colors.primaryStrong
                      : 'transparent',
                  },
                ]}
              >
                <MemberAvatar member={member} size={24} />
                <Text
                  style={[
                    styles.userChipText,
                    {
                      color: isActive
                        ? theme.colors.primaryStrong
                        : theme.colors.textSecondary,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {member.name}
                </Text>
                {isActive && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.colors.primaryStrong}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard
        title="Tareas rotativas (test)"
        subtitle="Simula el cierre de semana: avanza el turno circular"
      >
        {rotatingTasks.length === 0 ? (
          <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
            Aún no hay tareas rotativas. Crea una desde Tareas activando
            "Tarea rotativa (por turnos)".
          </Text>
        ) : (
          rotatingTasks.map((task) => {
            const owner = getMemberById(task.assigneeId)?.name ?? '?';
            return (
              <View key={task.id} style={styles.turnRow}>
                <View style={styles.turnInfo}>
                  <Text
                    style={[
                      styles.turnTaskTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text
                    style={[
                      styles.turnOwner,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Turno: {owner}
                  </Text>
                </View>
                <Ionicons
                  name="repeat"
                  size={16}
                  color={theme.colors.primaryStrong}
                />
              </View>
            );
          })
        )}
        {rotatingTasks.length > 0 ? (
          <View style={styles.turnActions}>
            <PillButton
              label="Avanzar turnos"
              variant="strong"
              onPress={() => {
                advanceAllTurns();
                setToast('Turnos avanzados · prueba de cierre de semana');
              }}
            />
          </View>
        ) : null}
      </SectionCard>

      <MemberRoleSheet
        visible={roleTarget !== null}
        member={roleTarget}
        onClose={() => setRoleTarget(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  userChipText: {
    fontSize: 13,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '800',
  },
  readOnlyHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    lineHeight: 17,
  },
  sectionHint: {
    fontSize: 13,
    marginTop: 4,
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  turnInfo: {
    flex: 1,
    gap: 2,
  },
  turnTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  turnOwner: {
    fontSize: 12,
    fontWeight: '600',
  },
  turnActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  paletteCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  swatches: {
    flexDirection: 'row',
    gap: 6,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 999,
  },
  paletteName: {
    fontSize: 13,
    fontWeight: '700',
  },
});