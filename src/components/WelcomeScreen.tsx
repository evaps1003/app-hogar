import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { MemberAvatar } from './MemberAvatar';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';
import { useHousehold } from '../data/HouseholdContext';
import { HouseholdRole, MemberColor } from '../data/types';

const ROLE_LABELS: Record<HouseholdRole, string> = {
  leader: 'Líder',
  coadmin: 'Co-admin',
  supervised: 'Supervisado',
};

const ROLE_OPTIONS: HouseholdRole[] = ['leader', 'coadmin', 'supervised'];

const COLOR_CHOICES: { color: MemberColor; label: string }[] = [
  { color: 'primary', label: 'Rosa' },
  { color: 'highlight', label: 'Amarillo' },
  { color: 'accent', label: 'Menta' },
];

interface WelcomeScreenProps {
  mode: 'create' | 'join';
  onDone: () => void;
}

export function WelcomeScreen({ mode, onDone }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const {
    members,
    householdName,
    addMember,
    assignDeviceMember,
    createHousehold,
  } = useHousehold();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<HouseholdRole>('supervised');
  const [homeName, setHomeName] = useState('');
  const [myName, setMyName] = useState('');
  const [myColor, setMyColor] = useState<MemberColor>('primary');

  const isCreate = mode === 'create';

  const choose = (id: string) => {
    assignDeviceMember(id);
    onDone();
  };

  const createMember = () => {
    const created = addMember({ name, householdRole: role });
    if (!created) return;
    setName('');
    setAddOpen(false);
    assignDeviceMember(created.id);
    onDone();
  };

  const begin = () => {
    createHousehold({ homeName, memberName: myName, color: myColor });
    onDone();
  };

  const canBegin = homeName.trim().length > 0 && myName.trim().length > 0;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radius.xl,
            },
          ]}
        >
          <Text style={styles.heroEmoji}>{isCreate ? '🏠' : '🙌'}</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {isCreate ? 'Crear mi hogar' : '¿Quién eres?'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isCreate
              ? 'Nombra vuestra casa y crea tu perfil. La primera persona que entre será el Líder del hogar.'
              : `Te estás uniendo a ${householdName}. Este móvil quedará vinculado a tu perfil: tareas, avisos, gastos y compras se asignarán a tu miembro.`}
          </Text>
        </View>

        {isCreate ? (
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                shadowColor: theme.shadows.card.shadowColor,
                shadowOpacity: theme.shadows.card.shadowOpacity,
                shadowRadius: theme.shadows.card.shadowRadius,
                shadowOffset: theme.shadows.card.shadowOffset,
                elevation: theme.shadows.card.elevation,
              },
            ]}
          >
            <Text
              style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
            >
              ¿Cómo se llama vuestra casa o piso?
            </Text>
            <TextInput
              value={homeName}
              onChangeText={setHomeName}
              placeholder="ej. Nuestro Piso"
              placeholderTextColor={theme.colors.tabInactive}
              returnKeyType="done"
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.textPrimary,
                  borderRadius: theme.radius.pill,
                },
              ]}
            />

            <Text
              style={[
                styles.fieldLabel,
                styles.fieldGap,
                { color: theme.colors.textSecondary },
              ]}
            >
              ¿Cómo te llamas?
            </Text>
            <TextInput
              value={myName}
              onChangeText={setMyName}
              placeholder="Tu nombre"
              placeholderTextColor={theme.colors.tabInactive}
              returnKeyType="done"
              autoFocus
              onSubmitEditing={begin}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.textPrimary,
                  borderRadius: theme.radius.pill,
                },
              ]}
            />

            <Text
              style={[
                styles.fieldLabel,
                styles.fieldGap,
                { color: theme.colors.textSecondary },
              ]}
            >
              Elige tu color pastel
            </Text>
            <View style={styles.colorRow}>
              {COLOR_CHOICES.map(({ color, label }) => {
                const selected = myColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setMyColor(color)}
                    style={styles.colorOption}
                  >
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: theme.colors[color],
                          borderColor: selected
                            ? theme.colors[`${color}Strong`]
                            : 'transparent',
                        },
                      ]}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.colorLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <PillButton
              label="Comenzar"
              variant="strong"
              disabled={!canBegin}
              onPress={begin}
            />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Después podrás invitar a más personas desde Ajustes.
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              ¿Quién usa este móvil?
            </Text>

            {members.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => choose(member.id)}
                style={({ pressed }) => [
                  styles.memberRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.lg,
                    shadowColor: theme.shadows.card.shadowColor,
                    shadowOpacity: theme.shadows.card.shadowOpacity,
                    shadowRadius: theme.shadows.card.shadowRadius,
                    shadowOffset: theme.shadows.card.shadowOffset,
                    elevation: theme.shadows.card.elevation,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
              >
                <MemberAvatar member={member} size={44} />
                <View style={styles.memberInfo}>
                  <Text
                    style={[
                      styles.memberName,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {member.name}
                  </Text>
                  <Text
                    style={[
                      styles.memberRole,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {ROLE_LABELS[member.householdRole]}
                  </Text>
                </View>
                <View
                  style={[
                    styles.choosePill,
                    { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.choosePillText,
                      { color: theme.colors.primaryStrong },
                    ]}
                  >
                    Entrar
                  </Text>
                </View>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => [
                styles.addRow,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.radius.lg,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View
                style={[
                  styles.addIcon,
                  { backgroundColor: theme.colors.primaryStrong },
                ]}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </View>
              <Text
                style={[styles.addText, { color: theme.colors.primaryStrong }]}
              >
                + Añadir nuevo miembro
              </Text>
            </Pressable>

            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Puedes cambiar de perfil desde Ajustes en cualquier momento.
            </Text>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nuevo miembro"
        subtitle="La persona que usará este móvil. Recibirá un color pastel propio."
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre (ej. Mamá)"
          placeholderTextColor={theme.colors.tabInactive}
          returnKeyType="done"
          autoFocus
          onSubmitEditing={createMember}
          style={[
            styles.addInput,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
          ¿Qué rol tendrá?
        </Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((option) => {
            const active = role === option;
            return (
              <Pressable
                key={option}
                onPress={() => setRole(option)}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: active
                      ? theme.colors.primarySoft
                      : theme.colors.surfaceVariant,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1.5,
                    borderColor: active
                      ? theme.colors.primaryStrong
                      : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    {
                      color: active
                        ? theme.colors.primaryStrong
                        : theme.colors.textSecondary,
                      fontWeight: active ? '800' : '600',
                    },
                  ]}
                >
                  {ROLE_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PillButton
          label="Crear perfil y entrar"
          variant="strong"
          disabled={!name.trim()}
          onPress={createMember}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  formCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  fieldGap: {
    marginTop: 20,
  },
  textInput: {
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 26,
    marginBottom: 26,
  },
  colorOption: {
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  choosePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  choosePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 18,
  },
  addInput: {
    height: 46,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  roleChipText: {
    fontSize: 13,
  },
});