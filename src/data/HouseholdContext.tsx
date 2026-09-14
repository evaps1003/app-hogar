import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSeedHouse } from './seed';
import { HouseData, HouseholdRole, Member, MemberColor } from './types';

const STORAGE_KEY = 'hogar.household.v1';

interface AddMemberInput {
  name: string;
  householdRole: HouseholdRole;
  color?: MemberColor;
}

interface HouseholdContextValue {
  members: Member[];
  activeMemberId: string | null;
  activeMember: Member | null;
  ready: boolean;
  categories: string[];
  addMember: (input: AddMemberInput) => void;
  setActiveMember: (id: string) => void;
  getMemberById: (id: string | null) => Member | undefined;
  updateMemberRole: (id: string, householdRole: HouseholdRole) => void;
  addCategory: (name: string) => void;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(
  undefined,
);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const COLOR_ORDER: MemberColor[] = ['primary', 'highlight', 'accent'];

function nextColor(members: Member[]): MemberColor {
  const counts: Record<MemberColor, number> = {
    primary: 0,
    highlight: 0,
    accent: 0,
  };
  members.forEach((member) => {
    counts[member.color] += 1;
  });
  return [...COLOR_ORDER].sort((a, b) => counts[a] - counts[b])[0];
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HouseData | null>(null);
  const [ready, setReady] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          if (raw) {
            const parsed = JSON.parse(raw) as HouseData;
            if (Array.isArray(parsed.members)) {
              setState({
                ...parsed,
                activeMemberId:
                  parsed.activeMemberId ??
                  parsed.members[0]?.id ??
                  null,
                categories: Array.isArray(parsed.categories)
                  ? parsed.categories
                  : [],
              });
            } else {
              setState(buildSeedHouse());
            }
          } else {
            setState(buildSeedHouse());
          }
        }
      } catch {
        if (!cancelled) setState(buildSeedHouse());
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state || firstRender.current) {
      firstRender.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo<HouseholdContextValue>(() => {
    const members = state?.members ?? [];

    const addMember = (input: AddMemberInput) => {
      const name = input.name.trim();
      if (!name) return;
      const member: Member = {
        id: makeId('member'),
        name,
        color: input.color ?? nextColor(members),
        householdRole: input.householdRole,
      };
      setState((prev) =>
        prev
          ? { ...prev, members: [...prev.members, member] }
          : { members: [member], activeMemberId: null },
      );
    };

    const setActiveMember = (id: string) => {
      setState((prev) =>
        prev && prev.members.some((member) => member.id === id)
          ? { ...prev, activeMemberId: id }
          : prev,
      );
    };

    const updateMemberRole = (id: string, householdRole: HouseholdRole) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((member) =>
                member.id === id ? { ...member, householdRole } : member,
              ),
            }
          : prev,
      );
    };

    const addCategory = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (activeMember?.householdRole === 'supervised') return;
      const current = Array.isArray(state?.categories) ? state!.categories : [];
      if (
        current.some((c) => c.toLowerCase() === trimmed.toLowerCase())
      ) {
        return;
      }
      setState((prev) =>
        prev
          ? { ...prev, categories: [...current, trimmed] }
          : prev,
      );
    };

    const activeMember =
      members.find((member) => member.id === state?.activeMemberId) ?? null;

    return {
      members,
      activeMemberId: state?.activeMemberId ?? null,
      activeMember,
      ready,
      categories: Array.isArray(state?.categories) ? state!.categories : [],
      addMember,
      setActiveMember,
      getMemberById: (id) => members.find((member) => member.id === id),
      updateMemberRole,
      addCategory,
    };
  }, [state, ready]);

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}