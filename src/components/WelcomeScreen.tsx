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
import { PillButton } from './PillButton';
import { useHousehold } from '../data/HouseholdContext';
import { HouseholdRole, MemberColor } from '../data/types';

const ROLE_LABELS: Record<HouseholdRole, string> = {
  leader: 'Líder',
  coadmin: 'Co-admin',
  supervised: 'Supervisado',
};

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
    assignDeviceMember,
    createHousehold,
  } = useHousehold();
  const [homeName, setHomeName] = useState('');
  const [myName, setMyName] = useState('');
  const [myColor, setMyColor] = useState<MemberColor>('primary');

  const isCreate = mode === 'create';

  const claimableMembers = members.filter(
    (member) => member.householdRole !== 'leader',
  );

  const choose = (id: string) => {
    assignDeviceMember(id);
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
              : `Te estás uniendo a ${householdName}. El Líder crea los perfiles de cada persona; elige el tuyo.`}
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
        ) : claimableMembers.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <Text
              style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
            >
              Aún no tienes perfil en {householdName}
            </Text>
            <Text
              style={[styles.emptyBody, { color: theme.colors.textSecondary }]}
            >
              El Líder añade el perfil de cada persona desde Ajustes. Pídele que
              cree el tuyo y que te reenvíe la invitación.
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
              ¿Quién eres? Elige tu perfil
            </Text>

            {claimableMembers.map((member) => (
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

            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Tu perfil siempre será este en este móvil. Cambia el móvil que lo
              usa desde Ajustes.
            </Text>
          </>
        )}
      </ScrollView>
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
  hint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 18,
  },
  emptyCard: {
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
});