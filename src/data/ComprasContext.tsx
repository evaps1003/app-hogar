import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHousehold } from './HouseholdContext';
import { useTasks } from './TaskContext';
import { toDateKey } from './schedule';
import {
  CategoryTone,
  ExpenseCategory,
  ExpenseCategoryConfig,
  GroceryExpense,
  Member,
  ShoppingCategory,
  ShoppingCategoryConfig,
  ShoppingItem,
  ShoppingList,
  ShoppingRotation,
  ShoppingStorage,
} from './types';

const STORAGE_KEY = 'hogar.shopping.v1';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = 'supermercado';

export const DEFAULT_LIST_NAME = 'General Casa';

export const BUILTIN_CATEGORY_IDS = ['basicos', 'despensa', 'caprichos'];

export const DEFAULT_CATEGORIES: ShoppingCategoryConfig[] = [
  { id: 'basicos', name: 'Básicos', tone: 'primary', builtin: true },
  { id: 'despensa', name: 'Despensa', tone: 'info', builtin: true },
  { id: 'caprichos', name: 'Caprichos', tone: 'warning', builtin: true },
];

export const BUILTIN_EXPENSE_CATEGORY_IDS = [
  'supermercado',
  'hogar',
  'ocio',
  'farmacia',
  'otros',
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  { id: 'supermercado', name: 'Supermercado', tone: 'primary', builtin: true },
  { id: 'hogar', name: 'Hogar', tone: 'info', builtin: true },
  { id: 'ocio', name: 'Ocio', tone: 'highlight', builtin: true },
  { id: 'farmacia', name: 'Farmacia', tone: 'accent', builtin: true },
  { id: 'otros', name: 'Otros', tone: 'warning', builtin: true },
];

export const CATEGORY_TONE_STRONG: Record<CategoryTone, string> = {
  primary: 'primaryStrong',
  highlight: 'highlightStrong',
  accent: 'accentStrong',
  info: 'infoStrong',
  warning: 'warningStrong',
};

const CUSTOM_TONE_ORDER: CategoryTone[] = [
  'primary',
  'highlight',
  'accent',
  'info',
  'warning',
];

interface ExpenseInput {
  amount: number;
  paidBy: string;
  participants: string[];
  note: string | null;
  category: ExpenseCategory;
  listId?: string;
}

export interface NewItemInput {
  name: string;
  category: ShoppingCategory;
  assigneeId: string | null;
  urgent: boolean;
  rotation: ShoppingRotation | null;
}

export interface NewListInput {
  name: string;
  memberIds: string[];
}

interface ComprasContextValue {
  lists: ShoppingList[];
  items: ShoppingItem[];
  expenses: GroceryExpense[];
  settledByList: Record<string, number | null>;
  categories: ShoppingCategoryConfig[];
  expenseCategories: ExpenseCategoryConfig[];
  ready: boolean;
  createList: (input: NewListInput) => ShoppingList | undefined;
  updateList: (listId: string, input: NewListInput) => void;
  deleteList: (listId: string) => void;
  addItem: (listId: string, input: NewItemInput) => void;
  updateItem: (itemId: string, input: NewItemInput) => void;
  toggleItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  addExpense: (input: ExpenseInput) => void;
  settleList: (listId: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addExpenseCategory: (name: string) => void;
  renameExpenseCategory: (id: string, name: string) => void;
  deleteExpenseCategory: (id: string) => void;
}

const ComprasContext = createContext<ComprasContextValue | undefined>(
  undefined,
);

const DEFAULT_EMPTY: ShoppingStorage = {
  lists: [],
  items: [],
  expenses: [],
  settledByList: {},
  categories: DEFAULT_CATEGORIES,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
};

function applyChecked(
  item: ShoppingItem,
  checked: boolean,
  rotateOnCheck: boolean,
): ShoppingItem {
  const next: ShoppingItem = {
    ...item,
    checked,
    checkedAt: checked ? Date.now() : null,
  };
  if (
    rotateOnCheck &&
    checked &&
    next.rotation &&
    next.rotation.memberIds.length > 0
  ) {
    const memberIds = next.rotation.memberIds;
    next.rotation = {
      ...next.rotation,
      currentIndex: (next.rotation.currentIndex + 1) % memberIds.length,
    };
  }
  return next;
}

function buildDefaultList(members: Member[]): ShoppingList {
  return {
    id: makeId('list'),
    name: DEFAULT_LIST_NAME,
    memberIds: members.map((m) => m.id),
    personal: false,
    creatorId: null,
    createdAt: Date.now(),
  };
}

function buildSeedStorage(members: Member[]): ShoppingStorage {
  const now = Date.now();
  const allIds = members.map((m) => m.id);
  const defaultList = buildDefaultList(members);
  const seeds: [string, ShoppingCategory][] = [
    ['Aceite de oliva', 'basicos'],
    ['Papel higiénico', 'basicos'],
    ['Pan de molde', 'despensa'],
    ['Tarta de chocolate', 'caprichos'],
  ];
  return {
    lists: [defaultList],
    items: seeds.map(([name, category], index) => ({
      id: makeId('item'),
      name,
      category,
      listId: defaultList.id,
      assigneeId: null,
      checked: false,
      createdBy: null,
      createdAt: now + index,
      checkedAt: null,
      urgent: false,
      urgentTaskId: null,
      rotation:
        name === 'Aceite de oliva' && allIds.length > 0
          ? { memberIds: allIds, currentIndex: 0 }
          : null,
    })),
    expenses: [],
    settledByList: {},
    categories: DEFAULT_CATEGORIES,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  };
}

function migrateStorage(raw: string, members: Member[]): ShoppingStorage {
  const parsed = JSON.parse(raw) as Partial<ShoppingStorage>;
  let lists = Array.isArray(parsed.lists) ? parsed.lists : [];
  let fallbackListId: string | null = null;
  if (lists.length === 0) {
    const dl = buildDefaultList(members);
    lists = [dl];
    fallbackListId = dl.id;
  }
  const listIds = new Set(lists.map((l) => l.id));
  const items = Array.isArray(parsed.items)
    ? (parsed.items as Array<
        Partial<ShoppingItem> & { listId?: string }
      >).map((item) => {
        const listId =
          typeof item.listId === 'string' && listIds.has(item.listId)
            ? item.listId
            : fallbackListId ?? lists[0]?.id ?? '';
        return {
          id: item.id ?? makeId('item'),
          name: item.name ?? '',
          category: item.category ?? 'basicos',
          listId,
          assigneeId: item.assigneeId ?? null,
          checked: item.checked === true,
          createdBy: item.createdBy ?? null,
          createdAt: item.createdAt ?? 0,
          checkedAt: item.checkedAt ?? null,
          urgent: item.urgent === true,
          urgentTaskId: item.urgentTaskId ?? null,
          rotation: item.rotation ?? null,
        };
      })
    : [];
  const existing =
    Array.isArray(parsed.categories) ? parsed.categories : [];
  const seen = new Set<string>();
  const categories: ShoppingCategoryConfig[] = [];
  DEFAULT_CATEGORIES.forEach((category) => {
    const found = existing.find((x) => x && x.id === category.id);
    if (found) {
      seen.add(found.id);
      categories.push({
        id: found.id,
        name: String(found.name ?? '').trim() || category.name,
        tone: CUSTOM_TONE_ORDER.includes(found.tone)
          ? found.tone
          : category.tone,
        builtin: true,
      });
    } else {
      seen.add(category.id);
      categories.push(category);
    }
  });
  existing.forEach((x) => {
    if (!x || seen.has(x.id)) return;
    const name = String(x.name ?? '').trim();
    if (!name) return;
    seen.add(x.id);
    categories.push({
      id: String(x.id),
      name,
      tone: CUSTOM_TONE_ORDER.includes(x.tone) ? x.tone : 'accent',
      builtin: false,
    });
  });

  const existingExpenseCategories = Array.isArray(parsed.expenseCategories)
    ? (parsed.expenseCategories as ExpenseCategoryConfig[])
    : [];
  const seenExpense = new Set<string>();
  const expenseCategories: ExpenseCategoryConfig[] = [];
  DEFAULT_EXPENSE_CATEGORIES.forEach((category) => {
    const found = existingExpenseCategories.find(
      (x) => x && x.id === category.id,
    );
    if (found) {
      seenExpense.add(found.id);
      expenseCategories.push({
        id: found.id,
        name: String(found.name ?? '').trim() || category.name,
        tone: CUSTOM_TONE_ORDER.includes(found.tone)
          ? found.tone
          : category.tone,
        builtin: true,
      });
    } else {
      seenExpense.add(category.id);
      expenseCategories.push(category);
    }
  });
  existingExpenseCategories.forEach((x) => {
    if (!x || seenExpense.has(x.id)) return;
    const name = String(x.name ?? '').trim();
    if (!name) return;
    seenExpense.add(x.id);
    expenseCategories.push({
      id: String(x.id),
      name,
      tone: CUSTOM_TONE_ORDER.includes(x.tone) ? x.tone : 'accent',
      builtin: false,
    });
  });

  return {
    lists,
    items,
    expenses: Array.isArray(parsed.expenses)
      ? parsed.expenses.map((expense) => ({
          ...expense,
          category: expense.category ?? DEFAULT_EXPENSE_CATEGORY,
          listId:
            typeof expense.listId === 'string' && listIds.has(expense.listId)
              ? expense.listId
              : fallbackListId ?? lists[0]?.id ?? '',
        }))
      : [],
    settledByList: (() => {
      const settled = parsed.settledByList;
      if (settled && typeof settled === 'object') {
        return Object.fromEntries(
          Object.entries(settled).filter(([id]) => listIds.has(id)),
        );
      }
      if (typeof (parsed as { settledAt?: number }).settledAt === 'number') {
        const target = fallbackListId ?? lists[0]?.id;
        return target
          ? {
              [target]: (parsed as { settledAt?: number }).settledAt ?? null,
            }
          : {};
      }
      return {};
    })(),
    categories,
    expenseCategories,
  };
}

export function ComprasProvider({ children }: { children: React.ReactNode }) {
  const { members, activeMember } = useHousehold();
  const { tasks, addTask, claimFreeTask, reopen, deleteTask } = useTasks();
  const [state, setState] = useState<ShoppingStorage | null>(null);
  const [ready, setReady] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          if (raw) {
            setState(migrateStorage(raw, members));
          } else {
            setState(buildSeedStorage(members));
          }
        }
      } catch {
        if (!cancelled) setState(buildSeedStorage(members));
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [members]);

  useEffect(() => {
    if (!state || firstRender.current) {
      firstRender.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const taskById = new Map<string, boolean>();
    tasks.forEach((t) => taskById.set(t.id, t.completed));
    let changed = false;
    const nextItems = state.items.map((item) => {
      const taskId = item.urgentTaskId;
      if (!taskId || !taskById.has(taskId)) return item;
      const taskCompleted = taskById.get(taskId)!;
      if (taskCompleted === item.checked) return item;
      changed = true;
      return applyChecked(item, taskCompleted, true);
    });
    if (changed) {
      setState((prev) => (prev ? { ...prev, items: nextItems } : prev));
    }
  }, [tasks]);

  const value = useMemo<ComprasContextValue>(() => {
    const lists = state?.lists ?? DEFAULT_EMPTY.lists;
    const items = state?.items ?? DEFAULT_EMPTY.items;
    const expenses = state?.expenses ?? DEFAULT_EMPTY.expenses;

    const createList = (input: NewListInput): ShoppingList | undefined => {
      const trimmed = input.name.trim();
      if (!trimmed) return undefined;
      const me = activeMember?.id ?? null;
      const selected = Array.from(
        new Set(input.memberIds.filter(Boolean)),
      );
      const memberIds = selected.length > 0 ? selected : members.map((m) => m.id);
      const finalMembers = me
        ? Array.from(new Set([...memberIds, me]))
        : memberIds;
      const personal =
        me !== null &&
        finalMembers.length === 1 &&
        finalMembers[0] === me;
      const list: ShoppingList = {
        id: makeId('list'),
        name: trimmed,
        memberIds: finalMembers,
        personal,
        creatorId: me,
        createdAt: Date.now(),
      };
      setState((prev) =>
        prev
          ? { ...prev, lists: [...prev.lists, list] }
          : { ...DEFAULT_EMPTY, lists: [list] },
      );
      return list;
    };

    const updateList = (listId: string, input: NewListInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) return;
      const me = activeMember?.id ?? null;
      const selected = Array.from(
        new Set(input.memberIds.filter(Boolean)),
      );
      const memberIds = selected.length > 0 ? selected : members.map((m) => m.id);
      const finalMembers = me
        ? Array.from(new Set([...memberIds, me]))
        : memberIds;
      const personal =
        me !== null &&
        finalMembers.length === 1 &&
        finalMembers[0] === me;
      setState((prev) =>
        prev
          ? {
              ...prev,
              lists: prev.lists.map((list) =>
                list.id === listId
                  ? {
                      ...list,
                      name: trimmed,
                      memberIds: finalMembers,
                      personal,
                    }
                  : list,
              ),
            }
          : prev,
      );
    };

    const deleteList = (listId: string) => {
      const toRemove = state?.items.filter((item) => item.listId === listId) ?? [];
      toRemove.forEach((item) => {
        if (item.urgentTaskId) {
          const linked = tasks.find((t) => t.id === item.urgentTaskId);
          if (linked && !linked.completed) deleteTask(linked.id);
        }
      });
      setState((prev) =>
        prev
          ? {
              ...prev,
              lists: prev.lists.filter((list) => list.id !== listId),
              items: prev.items.filter((item) => item.listId !== listId),
              expenses: prev.expenses.filter(
                (expense) => expense.listId !== listId,
              ),
            }
          : prev,
      );
    };

    const addItem = (listId: string, input: NewItemInput) => {
      const trimmed = input.name.trim();
      if (!trimmed || !listId) return;
      let urgentTaskId: string | null = null;
      if (input.urgent) {
        const created = addTask({
          title: `Comprar ${trimmed}`,
          assigneeId: null,
          category: 'otros',
          urgent: true,
        });
        if (created) urgentTaskId = created.id;
      }
      const item: ShoppingItem = {
        id: makeId('item'),
        name: trimmed,
        category: input.category,
        listId,
        assigneeId: input.assigneeId,
        checked: false,
        createdBy: activeMember?.id ?? null,
        createdAt: Date.now(),
        checkedAt: null,
        urgent: input.urgent,
        urgentTaskId,
        rotation: input.rotation,
      };
      setState((prev) =>
        prev
          ? { ...prev, items: [item, ...prev.items] }
          : { ...DEFAULT_EMPTY, items: [item] },
      );
    };

    const updateItem = (itemId: string, input: NewItemInput) => {
      const item = state?.items.find((i) => i.id === itemId);
      if (!item) return;
      const trimmed = input.name.trim();
      if (!trimmed) return;
      let urgentTaskId: string | null = item.urgentTaskId ?? null;
      const nowUrgent = !!input.urgent;
      if (nowUrgent && !urgentTaskId) {
        const created = addTask({
          title: `Comprar ${trimmed}`,
          assigneeId: null,
          category: 'otros',
          urgent: true,
        });
        if (created) urgentTaskId = created.id;
      } else if (!nowUrgent && urgentTaskId) {
        const linked = tasks.find((t) => t.id === urgentTaskId);
        if (linked && !linked.completed) deleteTask(urgentTaskId);
        urgentTaskId = null;
      }
      const nextItem: ShoppingItem = {
        ...item,
        name: trimmed,
        category: input.category,
        assigneeId: input.assigneeId,
        urgent: nowUrgent,
        urgentTaskId,
        rotation: input.rotation,
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === itemId ? nextItem : i)),
            }
          : prev,
      );
    };

    const toggleItem = (itemId: string) => {
      const item = state?.items.find((i) => i.id === itemId);
      if (!item) return;
      const checked = !item.checked;
      const taskId = item.urgentTaskId;
      if (taskId) {
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.completed !== checked) {
          if (checked) claimFreeTask(taskId);
          else reopen(taskId);
        }
      }
      const next = applyChecked(item, checked, true);
      setState((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === itemId ? next : i)),
            }
          : prev,
      );
    };

    const deleteItem = (itemId: string) => {
      const item = state?.items.find((i) => i.id === itemId);
      if (item?.urgentTaskId) {
        const linked = tasks.find((t) => t.id === item.urgentTaskId);
        if (linked && !linked.completed) deleteTask(linked.id);
      }
      setState((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) }
          : prev,
      );
    };

    const addExpense = (input: ExpenseInput) => {
      const participants = Array.from(
        new Set([...input.participants, input.paidBy]),
      ).filter(Boolean);
      if (!(input.amount > 0) || participants.length === 0) return;
      const listId =
        typeof input.listId === 'string' && input.listId
          ? input.listId
          : state?.lists[0]?.id ?? '';
      const expense: GroceryExpense = {
        id: makeId('gasto'),
        amount: Math.round(input.amount * 100) / 100,
        paidBy: input.paidBy,
        participants,
        note: input.note && input.note.trim() ? input.note.trim() : null,
        category: input.category,
        date: toDateKey(new Date()),
        createdAt: Date.now(),
        listId,
      };
      setState((prev) =>
        prev
          ? { ...prev, expenses: [expense, ...prev.expenses] }
          : { ...DEFAULT_EMPTY, expenses: [expense] },
      );
    };

    const settleList = (listId: string) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              settledByList: {
                ...prev.settledByList,
                [listId]: Date.now(),
              },
            }
          : prev,
      );
    };

    const addCategory = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existingNames = new Set(
        (state?.categories ?? DEFAULT_CATEGORIES).map((c) =>
          c.name.toLowerCase(),
        ),
      );
      if (existingNames.has(trimmed.toLowerCase())) return;
      const customCount = (state?.categories ?? DEFAULT_CATEGORIES).filter(
        (c) => !c.builtin,
      ).length;
      const tone =
        CUSTOM_TONE_ORDER[
          customCount % CUSTOM_TONE_ORDER.length
        ];
      const category: ShoppingCategoryConfig = {
        id: makeId('cat'),
        name: trimmed,
        tone,
        builtin: false,
      };
      setState((prev) =>
        prev
          ? { ...prev, categories: [...prev.categories, category] }
          : { ...DEFAULT_EMPTY, categories: [category] },
      );
    };

    const renameCategory = (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const conf = (state?.categories ?? DEFAULT_CATEGORIES).find(
        (c) => c.id === id,
      );
      if (!conf || conf.name.trim().toLowerCase() === trimmed.toLowerCase()) {
        return;
      }
      const duplicate = (state?.categories ?? DEFAULT_CATEGORIES).find(
        (c) =>
          c.id !== id &&
          c.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((c) =>
                c.id === id ? { ...c, name: trimmed } : c,
              ),
            }
          : prev,
      );
    };

    const deleteCategory = (id: string) => {
      const conf = (state?.categories ?? []).find((c) => c.id === id);
      if (!conf || conf.builtin) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.filter((c) => c.id !== id),
              items: prev.items.map((item) =>
                item.category === id
                  ? { ...item, category: 'basicos' }
                  : item,
              ),
            }
          : prev,
      );
    };

    const addExpenseCategory = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existingNames = new Set(
        (state?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES).map((c) =>
          c.name.toLowerCase(),
        ),
      );
      if (existingNames.has(trimmed.toLowerCase())) return;
      const customCount = (
        state?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES
      ).filter((c) => !c.builtin).length;
      const tone =
        CUSTOM_TONE_ORDER[customCount % CUSTOM_TONE_ORDER.length];
      const category: ExpenseCategoryConfig = {
        id: makeId('gcat'),
        name: trimmed,
        tone,
        builtin: false,
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              expenseCategories: [...prev.expenseCategories, category],
            }
          : { ...DEFAULT_EMPTY, expenseCategories: [category] },
      );
    };

    const renameExpenseCategory = (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const conf = (state?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES).find(
        (c) => c.id === id,
      );
      if (!conf || conf.name.trim().toLowerCase() === trimmed.toLowerCase()) {
        return;
      }
      const duplicate = (
        state?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES
      ).find(
        (c) =>
          c.id !== id &&
          c.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              expenseCategories: prev.expenseCategories.map((c) =>
                c.id === id ? { ...c, name: trimmed } : c,
              ),
            }
          : prev,
      );
    };

    const deleteExpenseCategory = (id: string) => {
      const conf = (state?.expenseCategories ?? []).find((c) => c.id === id);
      if (!conf || conf.builtin) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              expenseCategories: prev.expenseCategories.filter(
                (c) => c.id !== id,
              ),
              expenses: prev.expenses.map((expense) =>
                expense.category === id
                  ? { ...expense, category: 'supermercado' }
                  : expense,
              ),
            }
          : prev,
      );
    };

    return {
      lists,
      items,
      expenses,
      settledByList: state?.settledByList ?? {},
      categories: state?.categories ?? DEFAULT_CATEGORIES,
      expenseCategories:
        state?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES,
      ready,
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
    };
  }, [
    state,
    ready,
    activeMember,
    members,
    tasks,
    addTask,
    claimFreeTask,
    reopen,
    deleteTask,
  ]);

  return (
    <ComprasContext.Provider value={value}>{children}</ComprasContext.Provider>
  );
}

export function useCompras(): ComprasContextValue {
  const context = useContext(ComprasContext);
  if (!context) {
    throw new Error('useCompras must be used within a ComprasProvider');
  }
  return context;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BalanceEdge {
  fromId: string;
  toId: string;
  amount: number;
}

export interface BalanceView {
  paid: Map<string, number>;
  owed: Map<string, number>;
  position: Map<string, number>;
  edges: BalanceEdge[];
}

export function computeBalances(
  expenses: GroceryExpense[],
  memberIds: string[],
  settledAt: number | null = null,
): BalanceView {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  memberIds.forEach((id) => {
    paid.set(id, 0);
    owed.set(id, 0);
  });

  const active = settledAt
    ? expenses.filter((expense) => expense.createdAt > settledAt)
    : expenses;

  active.forEach((expense) => {
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + expense.amount);
    const share = expense.amount / expense.participants.length;
    expense.participants.forEach((participant) => {
      owed.set(participant, (owed.get(participant) ?? 0) + share);
    });
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  memberIds.forEach((id) => {
    const net = round2((paid.get(id) ?? 0) - (owed.get(id) ?? 0));
    if (net > 0.005) creditors.push({ id, amount: net });
    else if (net < -0.005) debtors.push({ id, amount: -net });
  });
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const edges: BalanceEdge[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const transfer = round2(
      Math.min(creditors[ci].amount, debtors[di].amount),
    );
    if (transfer > 0.005) {
      edges.push({
        fromId: debtors[di].id,
        toId: creditors[ci].id,
        amount: transfer,
      });
    }
    creditors[ci].amount = round2(creditors[ci].amount - transfer);
    debtors[di].amount = round2(debtors[di].amount - transfer);
    if (creditors[ci].amount < 0.005) ci += 1;
    if (debtors[di].amount < 0.005) di += 1;
  }

  const position = new Map<string, number>();
  memberIds.forEach((id) => {
    position.set(id, round2((paid.get(id) ?? 0) - (owed.get(id) ?? 0)));
  });

  return { paid, owed, position, edges };
}