import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SectionDivider } from '../components/SectionDivider';
import { EmptyState } from '../components/EmptyState';
import { CheckCircle } from '../components/CheckCircle';
import { MemberBadge } from '../components/MemberBadge';
import { AddTaskFab } from '../components/AddTaskFab';
import { NewShoppingItemSheet } from '../components/NewShoppingItemSheet';
import { NewShoppingListSheet } from '../components/NewShoppingListSheet';
import { NewExpenseSheet } from '../components/NewExpenseSheet';
import { StatsDonut, DonutSegment } from '../components/StatsDonut';
import {
  BUILTIN_CATEGORY_IDS,
  BUILTIN_EXPENSE_CATEGORY_IDS,
  CATEGORY_TONE_STRONG,
  computeBalances,
  DEFAULT_EXPENSE_CATEGORIES,
  NewItemInput,
  round2,
  useCompras,
} from '../data/ComprasContext';
import { useHousehold } from '../data/HouseholdContext';
import { MONTH_SHORT } from '../data/schedule';
import {
  ShoppingCategoryConfig,
  ShoppingItem,
  ShoppingList,
} from '../data/types';
import { useTheme } from '../theme';
import { Palette } from '../theme/palettes';
import { GestionarCategoriasSheet } from '../components/GestionarCategoriasSheet';

type ComprasView = 'lista' | 'gastos';

function formatPct(fraction: number): string {
  const pct = fraction * 100;
  if (pct <= 0) return '0%';
  if (pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function formatEuro(n: number): string {
  const cents = Math.round(n * 100);
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const centsText = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${euros.toLocaleString('es-ES')},${centsText} €`;
}

function dateLabel(key: string): string {
  const parts = key.split('-').map(Number);
  return `${parts[2]} ${MONTH_SHORT[parts[1] - 1]}`;
}

export function ComprasScreen() {
  const {
    lists,
    items,
    expenses,
    settledByList,
    categories,
    expenseCategories,
    createList,
    updateList,
    deleteList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    addExpense,
    settleList,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpenseCategory,
    renameExpenseCategory,
    deleteExpenseCategory,
  } = useCompras();
  const { members, getMemberById, activeMember } = useHousehold();
  const { theme } = useTheme();

  const [view, setView] = useState<ComprasView>('lista');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [itemSheetVisible, setItemSheetVisible] = useState(false);
  const [listSheetVisible, setListSheetVisible] = useState(false);
  const [expenseSheetVisible, setExpenseSheetVisible] = useState(false);
  const [categoriesSheetVisible, setCategoriesSheetVisible] = useState(false);
  const [categoriesSheetFor, setCategoriesSheetFor] = useState<
    'item' | 'expense' | null
  >(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  const myLists = useMemo(
    () =>
      lists.filter((list) => {
        if (!activeMember) return !list.personal;
        if (list.personal) return list.creatorId === activeMember.id;
        if (list.memberIds.length === 0) return true;
        return list.memberIds.includes(activeMember.id);
      }),
    [lists, activeMember],
  );

  const selectedList =
    myLists.find((l) => l.id === selectedListId) ?? myLists[0] ?? null;

  const listItems = useMemo(
    () => (selectedList ? items.filter((i) => i.listId === selectedList.id) : []),
    [items, selectedList],
  );

  const pendingCount = listItems.filter((item) => !item.checked).length;

  const orderedCategories = useMemo(() => {
    const builtByOrder: ShoppingCategoryConfig[] = [];
    BUILTIN_CATEGORY_IDS.forEach((id) => {
      const found = categories.find((c) => c.id === id);
      if (found) builtByOrder.push(found);
    });
    return [
      ...builtByOrder,
      ...categories.filter((c) => !BUILTIN_CATEGORY_IDS.includes(c.id)),
    ];
  }, [categories]);

  const listMembers = useMemo(
    () =>
      selectedList
        ? members.filter((m) => selectedList.memberIds.includes(m.id))
        : members,
    [members, selectedList],
  );

  const participantIdsFor = (list: ShoppingList) => {
    const allIds = members.map((m) => m.id);
    if (list.memberIds.length === 0) return allIds;
    const set = new Set(list.memberIds);
    return allIds.length > 0 && allIds.every((id) => set.has(id))
      ? allIds
      : list.memberIds;
  };

  const participantIds = useMemo<string[]>(
    () => (selectedList ? participantIdsFor(selectedList) : []),
    [members, selectedList],
  );

  const balanceMembers = useMemo(() => {
    const idsSet = new Set(participantIds);
    return members.filter((m) => idsSet.has(m.id));
  }, [members, participantIds]);

  const myGroups = useMemo(
    () =>
      myLists.map((list) => ({
        id: list.id,
        name: list.name,
        memberIds: participantIdsFor(list),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myLists, members],
  );

  const listExpenses = useMemo(
    () =>
      selectedList
        ? expenses.filter((e) => e.listId === selectedList.id)
        : [],
    [expenses, selectedList],
  );

  const balance = useMemo(
    () =>
      computeBalances(
        listExpenses,
        participantIds,
        selectedList ? (settledByList[selectedList.id] ?? null) : null,
      ),
    [listExpenses, participantIds, selectedList, settledByList],
  );

  const hasOutstanding = participantIds.some(
    (id) => Math.abs(balance.position.get(id) ?? 0) > 0.005,
  );

  const categoryStats = useMemo(() => {
    const byCategory = new Map<string, number>();
    listExpenses.forEach((expense) => {
      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + expense.amount,
      );
    });
    return Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [listExpenses]);

  const statsTotal = round2(
    categoryStats.reduce((sum, stat) => sum + stat.amount, 0),
  );

  const statsSegments: DonutSegment[] = categoryStats.map(
    ({ category, amount }) => {
      const conf = expenseCategories.find((c) => c.id === category);
      return {
        label: conf?.name ?? category,
        color:
          (conf
            ? theme.colors[
                CATEGORY_TONE_STRONG[conf.tone] as keyof Palette
              ]
            : undefined) ?? theme.colors.infoStrong,
        amountText: formatEuro(round2(amount)),
        pctText: formatPct(statsTotal > 0 ? amount / statsTotal : 0),
        fraction: statsTotal > 0 ? amount / statsTotal : 0,
      };
    },
  );

  const sortedExpenses = useMemo(
    () =>
      [...listExpenses].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.createdAt - a.createdAt;
      }),
    [listExpenses],
  );

  const cardStyle = {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    shadowOpacity: 0,
    elevation: 0,
  };

  const openAdd = () => {
    if (view === 'lista') {
      setEditingItem(null);
      setItemSheetVisible(true);
    } else {
      setExpenseSheetVisible(true);
    }
  };

  const openEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setItemSheetVisible(true);
  };

  const closeItemSheet = () => {
    setItemSheetVisible(false);
    setEditingItem(null);
  };

  const handleSaveItem = (input: NewItemInput) => {
    if (editingItem) {
      updateItem(editingItem.id, input);
    } else if (selectedList) {
      addItem(selectedList.id, input);
    }
    closeItemSheet();
  };

  const handleSaveList = (input: {
    name: string;
    memberIds: string[];
  }) => {
    if (editingList) {
      updateList(editingList.id, input);
      setEditingList(null);
    } else {
      const created = createList(input);
      if (created) setSelectedListId(created.id);
    }
    setListSheetVisible(false);
  };

  const handleDeleteList = (listId: string) => {
    deleteList(listId);
    setSelectedListId((current) => (current === listId ? null : current));
    setEditingList(null);
  };

  const handleSaveExpense = (input: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string | null;
    category: string;
    listId: string | null;
  }) => {
    addExpense({ ...input, listId: input.listId ?? undefined });
    setExpenseSheetVisible(false);
  };

  const renderItemRow = (item: ShoppingItem) => {
    const assignee = getMemberById(item.assigneeId);
    const rotationMember =
      item.rotation && item.rotation.memberIds.length > 0
        ? getMemberById(
            item.rotation.memberIds[
              item.rotation.currentIndex % item.rotation.memberIds.length
            ],
          )
        : undefined;
    return (
      <View
        key={item.id}
        style={[styles.itemRow, item.checked && styles.itemRowDone]}
      >
        <CheckCircle
          checked={item.checked}
          onPress={() => toggleItem(item.id)}
          size={24}
        />
        <View style={styles.itemMain}>
          <Text
            numberOfLines={2}
            style={[
              styles.itemName,
              {
                color: item.checked
                  ? theme.colors.textSecondary
                  : theme.colors.textPrimary,
              },
              item.checked && styles.itemDone,
            ]}
          >
            {item.name}
          </Text>
          {item.urgent ? (
            <View
              style={[
                styles.urgentPill,
                { backgroundColor: theme.colors.warningSoft },
              ]}
            >
              <Ionicons
                name="flame"
                size={11}
                color={theme.colors.warningStrong}
              />
              <Text
                style={[
                  styles.urgentPillText,
                  { color: theme.colors.warningStrong },
                ]}
              >
                Urgente
              </Text>
            </View>
          ) : null}
          {rotationMember && !item.checked ? (
            <View style={styles.rotationRow}>
              <Text
                style={[
                  styles.rotationLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Le toca a:
              </Text>
              <MemberBadge member={rotationMember} compact />
            </View>
          ) : null}
          {assignee ? <MemberBadge member={assignee} compact /> : null}
        </View>
        {item.checked ? (
          <Pressable
            onPress={() => deleteItem(item.id)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sideBtn,
              { transform: [{ scale: pressed ? 0.85 : 1 }] },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.tabInactive}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => openEdit(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sideBtn,
              { transform: [{ scale: pressed ? 0.85 : 1 }] },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={17}
              color={theme.colors.tabInactive}
            />
          </Pressable>
        )}
      </View>
    );
  };

  const renderBlock = (
    category: ShoppingCategoryConfig,
    listItemsList: ShoppingItem[],
  ) => {
    const pending = listItemsList.filter(
      (item) => item.category === category.id && !item.checked,
    );
    const checked = listItemsList.filter(
      (item) => item.category === category.id && item.checked,
    );
    if (pending.length === 0 && checked.length === 0) return null;
    return (
      <View key={category.id}>
        <SectionDivider label={category.name} />
        {pending.map((item) => renderItemRow(item))}
        {checked.map((item) => renderItemRow(item))}
      </View>
    );
  };

  const renderListsHeader = () => (
    <View style={styles.listsHeader}>
      {myLists.length >= 2 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.listsScrollView}
          contentContainerStyle={styles.listsScroll}
        >
          {myLists.map((list) => {
            const selected = list.id === selectedList?.id;
            return (
              <Pressable
                key={list.id}
                onPress={() => setSelectedListId(list.id)}
                onLongPress={() => {
                  setEditingList(list);
                  setListSheetVisible(true);
                }}
                delayLongPress={350}
                style={[
                  styles.listPill,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.listPillText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {list.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : selectedList ? (
        <Text
          style={[
            styles.singleListTitle,
            { color: theme.colors.textPrimary },
          ]}
        >
          {selectedList.name}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setListSheetVisible(true)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.addListBtn,
          {
            backgroundColor: theme.colors.primaryStrong,
            transform: [{ scale: pressed ? 0.9 : 1 }],
          },
        ]}
        accessibilityLabel="Crear lista"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  const renderLista = () => (
    <>
      {listItems.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          iconTint="highlight"
          title="Lista vacía"
          message="Añadid los artículos que falten con el botón +."
        />
      ) : (
        <SectionCard
          title="Lista de la compra"
          subtitle={`${pendingCount} por comprar`}
          style={cardStyle}
        >
          {orderedCategories.map((category) =>
            renderBlock(category, listItems),
          )}
        </SectionCard>
      )}
    </>
  );

  const renderGastos = () => {
    if (listExpenses.length === 0) {
      return (
        <EmptyState
          icon="receipt-outline"
          iconTint="accent"
          title="Aún no hay gastos"
          message={`Anotad cada compra con el botón + para llevar el balance de ${selectedList?.name ?? 'esta lista'}.`}
        />
      );
    }

    return (
      <>
        <SectionCard
          title={`Balance de ${selectedList?.name ?? 'la lista'}`}
          subtitle="Cuánto ha puesto cada quien"
          style={cardStyle}
        >
          {balanceMembers.map((member) => {
            const paid = balance.paid.get(member.id) ?? 0;
            const net = balance.position.get(member.id) ?? 0;
            let netText = 'a mano';
            let netColor = theme.colors.textSecondary;
            if (net > 0.005) {
              netText = `le deben ${formatEuro(net)}`;
              netColor = theme.colors.accentStrong;
            } else if (net < -0.005) {
              netText = `debe ${formatEuro(Math.abs(net))}`;
              netColor = theme.colors.warningStrong;
            }
            return (
              <View key={member.id} style={styles.balanceRow}>
                <MemberBadge member={member} compact />
                <Text
                  style={[
                    styles.balancePaid,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  puso {formatEuro(paid)}
                </Text>
                <Text style={[styles.balanceNet, { color: netColor }]}>
                  {netText}
                </Text>
              </View>
            );
          })}

          <View style={styles.settleWrap}>
            <Pressable
              onPress={() => {
                if (selectedList) settleList(selectedList.id);
              }}
              disabled={!hasOutstanding}
              style={({ pressed }) => [
                styles.settleButton,
                {
                  backgroundColor: theme.colors.highlightStrong,
                  opacity: hasOutstanding ? 1 : 0.4,
                  transform: [
                    { scale: pressed && hasOutstanding ? 0.98 : 1 },
                  ],
                },
              ]}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.settleText}>Saldar / Pagado</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          title="Historial de gastos"
          subtitle="Compras registradas"
          style={cardStyle}
        >
          {sortedExpenses.map((expense) => {
            const payer = getMemberById(expense.paidBy);
            return (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseMain}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.expenseNote,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {expense.note ?? 'Compra'}
                  </Text>
                  <Text
                    style={[
                      styles.expenseMeta,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {expenseCategories.find((c) => c.id === expense.category)?.name ??
                      expense.category} ·{' '}
                    {payer ? `Pagado por ${payer.name}` : 'Pagado'} ·{' '}
                    {dateLabel(expense.date)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.expenseAmount,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {formatEuro(expense.amount)}
                </Text>
              </View>
            );
          })}
        </SectionCard>

        <SectionCard
          title="Estadísticas"
          subtitle="Gasto total por categoría"
          style={cardStyle}
        >
          <StatsDonut
            segments={statsSegments}
            totalText={formatEuro(statsTotal)}
            totalLabel="Total gastado"
            holeColor={cardStyle.backgroundColor}
          />
        </SectionCard>
      </>
    );
  };

  return (
    <>
      <Screen overlay={<AddTaskFab onPress={openAdd} />}>
        <ScreenHeader
          title="Compras"
          subtitle="Lista compartida y balance del hogar"
        />

        <View style={styles.toggleRow}>
          {([
            {
              key: 'lista' as const,
              label: 'Lista de la compra',
              icon: 'cart-outline' as const,
            },
            {
              key: 'gastos' as const,
              label: 'Gastos',
              icon: 'receipt-outline' as const,
            },
          ]).map(({ key, label, icon }) => {
            const selected = view === key;
            return (
              <Pressable
                key={key}
                onPress={() => setView(key)}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={15}
                  color={selected ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: selected
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {renderListsHeader()}

        {view === 'lista' ? renderLista() : renderGastos()}
      </Screen>

      <NewShoppingItemSheet
        visible={itemSheetVisible}
        onClose={closeItemSheet}
        members={members}
        listMembers={listMembers}
        editingItem={editingItem}
        categories={orderedCategories.map((c) => ({ id: c.id, name: c.name }))}
        onManageCategories={() => {
          setCategoriesSheetFor('item');
          setCategoriesSheetVisible(true);
        }}
        onSave={handleSaveItem}
      />
      <NewShoppingListSheet
        visible={listSheetVisible}
        onClose={() => {
          setListSheetVisible(false);
          setEditingList(null);
        }}
        members={members}
        creatorId={activeMember?.id ?? null}
        editingList={editingList}
        onSave={handleSaveList}
        onDelete={handleDeleteList}
      />
      <GestionarCategoriasSheet
        visible={categoriesSheetVisible && categoriesSheetFor !== 'expense'}
        onClose={() => {
          setCategoriesSheetVisible(false);
          setCategoriesSheetFor(null);
        }}
        title="Gestionar categorías de la compra"
        subtitle="Crea, renombra o elimina categorías de productos"
        newLabel="Nueva categoría"
        placeholder="Ej. Mascotas, Farmacia..."
        categories={categories}
        toneColors={CATEGORY_TONE_STRONG}
        onAdd={addCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />
      <NewExpenseSheet
        visible={expenseSheetVisible}
        onClose={() => setExpenseSheetVisible(false)}
        members={members}
        groups={myGroups}
        initialGroupId={selectedList?.id ?? null}
        categories={expenseCategories.map((c) => ({ id: c.id, name: c.name }))}
        onManageCategories={() => {
          setCategoriesSheetFor('expense');
          setCategoriesSheetVisible(true);
        }}
        onSave={handleSaveExpense}
      />
      <GestionarCategoriasSheet
        visible={categoriesSheetVisible && categoriesSheetFor === 'expense'}
        onClose={() => {
          setCategoriesSheetVisible(false);
          setCategoriesSheetFor(null);
        }}
        title="Gestionar categorías de gasto"
        subtitle="Crea, renombra o elimina categorías de los gastos"
        newLabel="Nueva categoría"
        placeholder="Ej. Mascotas, Transporte..."
        categories={expenseCategories}
        toneColors={CATEGORY_TONE_STRONG}
        onAdd={addExpenseCategory}
        onRename={renameExpenseCategory}
        onDelete={deleteExpenseCategory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleChip: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  listsScrollView: {
    flex: 1,
  },
  listsScroll: {
    gap: 8,
    paddingRight: 4,
  },
  listPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  singleListTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  addListBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  itemRowDone: {
    opacity: 0.5,
  },
  itemMain: {
    flex: 1,
    gap: 5,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  itemDone: {
    textDecorationLine: 'line-through',
    textDecorationColor: '#C9BED1',
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  urgentPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rotationLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sideBtn: {
    padding: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  balancePaid: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  balanceNet: {
    fontSize: 13,
    fontWeight: '700',
  },
  settleWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  settleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  expenseMain: {
    flex: 1,
  },
  expenseNote: {
    fontSize: 15,
    fontWeight: '600',
  },
  expenseMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
});