import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { SectionCard } from './SectionCard';
import { MemberAvatar } from './MemberAvatar';
import { PillButton } from './PillButton';
import { useHousehold } from '../data/HouseholdContext';
import { useTasks } from '../data/TaskContext';
import { useCompras } from '../data/ComprasContext';
import { useDevTools } from '../data/DevToolsContext';

interface DevToolsPanelProps {
  onToast: (message: string) => void;
}

export function DevToolsPanel({ onToast }: DevToolsPanelProps) {
  const { theme } = useTheme();
  const { setEnabled } = useDevTools();
  const { members, activeMember, setActiveMember } = useHousehold();
  const { advanceAllTurns } = useTasks();
  const { advanceShoppingRotation } = useCompras();

  const advanceTurns = () => {
    advanceAllTurns();
    advanceShoppingRotation();
    onToast('⏭️ Turnos avanzados manualmente');
  };

  return (
    <SectionCard
      title="🧪 Herramientas de test"
      subtitle="Modo desarrollador · no visible para el resto"
      style={{
        backgroundColor: theme.colors.accentSoft,
        borderRadius: 20,
        shadowOpacity: 0,
        elevation: 0,
      }}
    >
      <Text
        style={[
          styles.sectionHint,
          { color: theme.colors.textSecondary },
        ]}
      >
        Cambia de perfil para ver cómo ve la app cada conviviente y fuerza la
        rotación de turnos sin esperar a que toque completar ciclos reales.
      </Text>

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Simulador de Usuario Activo
      </Text>
      <View style={[styles.chipsRow, { marginTop: 8 }]}>
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
                    ? theme.colors.highlightSoft
                    : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: isActive
                    ? theme.colors.highlightStrong
                    : 'transparent',
                },
              ]}
            >
              <MemberAvatar member={member} size={22} />
              <Text
                style={[
                  styles.userChipText,
                  {
                    color: isActive
                      ? theme.colors.highlightStrong
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
                  size={13}
                  color={theme.colors.highlightStrong}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.advanceWrap}>
        <PillButton label="⏭️ Avanzar turnos" variant="strong" onPress={advanceTurns} />
        <Pressable
          onPress={() => setEnabled(false)}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text
            style={[
              styles.disableLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Cerrar modo test
          </Text>
        </Pressable>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
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
  advanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 22,
  },
  disableLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});