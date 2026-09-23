import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { MemberAvatar } from '../components/MemberAvatar';
import { MemberRoleSheet } from '../components/MemberRoleSheet';
import { BottomSheet } from '../components/BottomSheet';
import { NoticeSheet } from '../components/NoticeSheet';
import { NoticeToast } from '../components/NoticeToast';
import { PillButton } from '../components/PillButton';
import { DevToolsPanel } from '../components/DevToolsPanel';
import { useHousehold } from '../data/HouseholdContext';
import { useDevTools } from '../data/DevToolsContext';
import { useSync } from '../data/SyncContext';
import { noticeExpiryLabel } from '../data/notices';
import { buildInviteUrl } from '../data/webLink';
import { HouseholdRole, HouseNotice, Member, NoticeInput } from '../data/types';
import { useTheme, buildTheme } from '../theme';
import { PALETTES } from '../theme/palettes';

const ROLE_LABELS: Record<HouseholdRole, string> = {
  leader: 'Líder',
  coadmin: 'Co-admin',
  supervised: 'Supervisado',
};

export function AjustesScreen() {
  const { theme, setPaletteById } = useTheme();
  const {
    members,
    activeMember,
    getMemberById,
    householdName,
    homeId,
    renameHousehold,
    notices,
    addNotice,
    updateNotice,
    deleteNotice,
  } = useHousehold();
  const devTools = useDevTools();
  const { enabled, taps, tap } = devTools;
  const { syncEnabled } = useSync();
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [noticeSheetOpen, setNoticeSheetOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<HouseNotice | null>(null);

  const isLeader = activeMember?.householdRole === 'leader';

  const openRename = () => {
    setNameDraft(householdName);
    setRenameVisible(true);
  };

  const handleRename = () => {
    renameHousehold(nameDraft);
    setRenameVisible(false);
    setToast('Nombre del hogar actualizado');
  };

  const openNewNotice = () => {
    setEditingNotice(null);
    setNoticeSheetOpen(true);
  };

  const openEditNotice = (notice: HouseNotice) => {
    setEditingNotice(notice);
    setNoticeSheetOpen(true);
  };

  const closeNoticeSheet = () => {
    setNoticeSheetOpen(false);
    setEditingNotice(null);
  };

  const handleNoticeSubmit = (input: NoticeInput) => {
    if (editingNotice) {
      updateNotice(editingNotice.id, input);
      setToast('Aviso actualizado');
    } else {
      addNotice(input);
      setToast('Aviso añadido al tablón');
    }
    closeNoticeSheet();
  };

  const handleInvite = async () => {
    if (!homeId || members.length === 0) {
      setToast('Este dispositivo aún no tiene hogar asignado');
      return;
    }
    const url = buildInviteUrl({ homeId, householdName, members });
    try {
      await Clipboard.setStringAsync(url);
      setToast('🔗 Enlace de invitación copiado al portapapeles');
    } catch {
      setToast(`Comparte este enlace: ${url}`);
    }
  };

  return (
    <Screen overlay={<NoticeToast message={toast} onDone={() => setToast(null)} />}>
      <ScreenHeader
        title="Ajustes"
        subtitle="Apariencia, hogar y roles"
        onPressTitle={tap}
      />

      <SectionCard
        title="Mi Apariencia"
        subtitle="Personal · solo cambia en tu dispositivo"
      >
        <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
          Tu paleta no afecta al resto del hogar. Toca para activar.
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
        title="📌 Tablón del hogar"
        subtitle="Notas y recordatorios de convivencia"
        style={{
          backgroundColor: theme.colors.highlightSoft,
          borderRadius: 20,
          shadowOpacity: 0,
          elevation: 0,
        }}
      >
        <Pressable
          onPress={openNewNotice}
          style={({ pressed }) => [
            styles.noticeAddBtn,
            {
              backgroundColor: theme.colors.highlightStrong,
              borderRadius: theme.radius.pill,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.noticeAddBtnText}>Nueva nota</Text>
        </Pressable>

        {notices.length === 0 ? (
          <Text
            style={[
              styles.readOnlyHint,
              { color: theme.colors.textSecondary },
            ]}
          >
            Sin notas todavía. Añade citas de técnicos, paquetería esperada,
            franjas de silencio o notas rápidas para el hogar.
          </Text>
        ) : (
          notices.map((notice) => {
            const author = getMemberById(notice.createdBy);
            return (
              <View key={notice.id} style={styles.noticeRow}>
                {author ? (
                  <MemberAvatar member={author} size={32} />
                ) : (
                  <View
                    style={[
                      styles.noticeAuthorFallback,
                      { backgroundColor: theme.colors.highlightStrong },
                    ]}
                  >
                    <Ionicons name="home" size={14} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.noticeBody}>
                  <Text
                    style={[
                      styles.noticeText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {notice.text}
                  </Text>
                  <Text
                    style={[
                      styles.noticeMeta,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {author?.name ?? 'Varios'} · {noticeExpiryLabel(notice)}
                  </Text>
                </View>
                <View style={styles.noticeActions}>
                  <Pressable
                    onPress={() => openEditNotice(notice)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.noticeAction,
                      pressed && { opacity: 0.5 },
                    ]}
                    accessibilityLabel="Editar nota"
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => deleteNotice(notice.id)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.noticeAction,
                      pressed && { opacity: 0.5 },
                    ]}
                    accessibilityLabel="Eliminar nota"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard
        title="Miembros y Roles del Hogar"
        subtitle={`${householdName} · ${members.length} persona${
          members.length === 1 ? '' : 's'
        }`}
      >
        {isLeader ? (
          <Pressable
            onPress={openRename}
            style={({ pressed }) => [
              styles.houseRow,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.radius.md,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="home-outline"
              size={18}
              color={theme.colors.primaryStrong}
            />
            <Text
              style={[styles.houseName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {householdName}
            </Text>
            <Ionicons
              name="create-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        ) : null}

        {members.map((member) => {
          const rowContent = (
            <>
              <MemberAvatar member={member} size={36} />
              <View style={styles.memberInfo}>
                <Text
                  style={[styles.memberName, { color: theme.colors.textPrimary }]}
                >
                  {member.name}
                </Text>
                <Text
                  style={[styles.memberRole, { color: theme.colors.textSecondary }]}
                >
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
              {isLeader ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.tabInactive}
                />
              ) : null}
            </>
          );

          return isLeader ? (
            <Pressable
              key={member.id}
              onPress={() => setRoleTarget(member)}
              style={({ pressed }) => [
                styles.memberRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              {rowContent}
            </Pressable>
          ) : (
            <View key={member.id} style={styles.memberRow}>
              {rowContent}
            </View>
          );
        })}

        {isLeader ? (
          <Pressable
            onPress={() => void handleInvite()}
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
            Solo el Líder del hogar puede cambiar roles, expulsar miembros o
            editar los datos de la casa.
          </Text>
        )}
      </SectionCard>

      {enabled ? <DevToolsPanel onToast={setToast} /> : null}

      <View style={styles.footer}>
        <Text
          style={[styles.versionHint, { color: theme.colors.tabInactive }]}
        >
          {syncEnabled
            ? '☁️ Datos sincronizados con el hogar'
            : '☁️ Sincronización sin configurar'}
        </Text>
        <Pressable
          onPress={tap}
          hitSlop={12}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text
            style={[styles.versionText, { color: theme.colors.tabInactive }]}
          >
            App Hogar · v1.0.0
          </Text>
        </Pressable>
        {taps > 0 && !enabled ? (
          <Text
            style={[styles.versionHint, { color: theme.colors.tabInactive }]}
          >
            Toca {5 - taps} más para abrir las herramientas de test
          </Text>
        ) : null}
      </View>

      <MemberRoleSheet
        visible={roleTarget !== null}
        member={roleTarget}
        onClose={() => setRoleTarget(null)}
      />

      <NoticeSheet
        visible={noticeSheetOpen}
        initial={editingNotice}
        onClose={closeNoticeSheet}
        onSubmit={handleNoticeSubmit}
      />

      <BottomSheet
        visible={renameVisible}
        onClose={() => setRenameVisible(false)}
        title="Renombrar el hogar"
        subtitle="El nombre que verán todos los convivientes."
      >
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="Ej. Casa de los Martínez"
          placeholderTextColor={theme.colors.tabInactive}
          returnKeyType="done"
          onSubmitEditing={handleRename}
          style={[
            styles.addInput,
            {
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.textPrimary,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 16,
              marginBottom: 18,
            },
          ]}
        />
        <PillButton label="Guardar nombre" variant="strong" onPress={handleRename} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  versionHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  houseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  houseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
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
  noticeAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  noticeAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  noticeAuthorFallback: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBody: {
    flex: 1,
    gap: 3,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  noticeMeta: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  noticeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  noticeAction: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHint: {
    fontSize: 13,
    marginTop: 4,
  },
  addInput: {
    height: 44,
    fontSize: 14,
    fontWeight: '600',
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
