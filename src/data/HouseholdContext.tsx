import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeNoticeExpiry, isNoticeExpired } from './notices';
import {
  getDeviceMemberId,
  setDeviceMemberId,
} from './device';
import { readJoinContext, InvitePayload } from './webLink';
import {
  HouseData,
  HouseholdRole,
  HouseNotice,
  Member,
  MemberColor,
  NoticeInput,
} from './types';

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
  householdName: string;
  notices: HouseNotice[];
  houseSnapshot: HouseData | null;
  replaceHouseState: (next: HouseData) => void;
  homeId: string;
  joinRequested: boolean;
  deviceMemberId: string | null;
  deviceReady: boolean;
  createHousehold: (input: {
    homeName: string;
    memberName: string;
    color: MemberColor;
  }) => Member;
  addMember: (input: AddMemberInput) => Member | undefined;
  setActiveMember: (id: string) => void;
  assignDeviceMember: (id: string) => void;
  getMemberById: (id: string | null) => Member | undefined;
  updateMemberRole: (id: string, householdRole: HouseholdRole) => void;
  removeMember: (id: string) => void;
  addCategory: (name: string) => void;
  renameHousehold: (name: string) => void;
  addNotice: (input: NoticeInput) => void;
  updateNotice: (id: string, input: NoticeInput) => void;
  deleteNotice: (id: string) => void;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(
  undefined,
);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function normalizeNotice(raw: unknown): HouseNotice | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const n = raw as Partial<HouseNotice>;
  if (typeof n.text !== 'string' || !n.text.trim()) return null;
  const duration =
    n.duration === 'hours' || n.duration === 'today' || n.duration === 'week'
      ? n.duration
      : 'never';
  return {
    id: typeof n.id === 'string' && n.id ? n.id : makeId('notice'),
    text: n.text.trim(),
    createdBy: typeof n.createdBy === 'string' ? n.createdBy : null,
    createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
    duration,
    hours:
      duration === 'hours' && typeof n.hours === 'number' ? n.hours : undefined,
    expiresAt: typeof n.expiresAt === 'number' ? n.expiresAt : null,
  };
}

function purgeExpired(notices: HouseNotice[], now = Date.now()): HouseNotice[] {
  return notices.filter((notice) => !isNoticeExpired(notice, now));
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

function buildHouseFromInvite(invite: InvitePayload): HouseData {
  return {
    members: invite.members.map((member) => ({ ...member })),
    activeMemberId: null,
    homeId: invite.homeId,
    householdName: (invite.homeName || '').trim() || 'Mi hogar',
    categories: [],
    notices: [],
  };
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HouseData | null>(null);
  const [ready, setReady] = useState(false);
  const [deviceMemberId, setDeviceMemberIdState] = useState<string | null>(
    null,
  );
  const [deviceReady, setDeviceReady] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const join = readJoinContext();
      const [raw, savedDeviceId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        getDeviceMemberId(),
      ]);
      if (cancelled) return;
      try {
        let next: HouseData | null = null;
        if (raw) {
          const parsed = JSON.parse(raw) as HouseData;
          if (Array.isArray(parsed.members)) {
            next = {
              ...parsed,
              homeId:
                typeof parsed.homeId === 'string' && parsed.homeId
                  ? parsed.homeId
                  : makeId('home'),
              activeMemberId:
                parsed.activeMemberId ?? parsed.members[0]?.id ?? null,
              categories: Array.isArray(parsed.categories)
                ? parsed.categories
                : [],
              householdName:
                typeof parsed.householdName === 'string' &&
                parsed.householdName.trim()
                  ? parsed.householdName
                  : 'Mi hogar',
              notices: Array.isArray(parsed.notices)
                ? purgeExpired(
                    parsed.notices
                      .map(normalizeNotice)
                      .filter(
                        (notice): notice is HouseNotice => notice !== null,
                      ),
                  )
                : [],
            };
          }
        }
        if (join.invite) next = buildHouseFromInvite(join.invite);
        if (!cancelled) {
          if (savedDeviceId) setDeviceMemberIdState(savedDeviceId);
          setState(next);
          setJoinRequested(join.requested);
        }
      } catch {
        if (!cancelled) {
          setState(join.invite ? buildHouseFromInvite(join.invite) : null);
          setJoinRequested(join.requested);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
          setDeviceReady(true);
        }
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

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      const now = Date.now();
      const notices = state.notices ?? [];
      if (!notices.some((notice) => isNoticeExpired(notice, now))) return;
      setState((prev) =>
        prev
          ? { ...prev, notices: purgeExpired(prev.notices ?? [], now) }
          : prev,
      );
    }, 30_000);
    return () => clearInterval(id);
  }, [state]);

  const value = useMemo<HouseholdContextValue>(() => {
    const members = state?.members ?? [];

    const createHousehold = (input: {
      homeName: string;
      memberName: string;
      color: MemberColor;
    }): Member => {
      const memberName = input.memberName.trim();
      const homeName = input.homeName.trim();
      const member: Member = {
        id: makeId('member'),
        name: memberName || 'Yo',
        color: input.color,
        householdRole: 'leader',
      };
      const house: HouseData = {
        members: [member],
        activeMemberId: member.id,
        homeId: makeId('home'),
        householdName: homeName || 'Mi hogar',
        categories: [],
        notices: [],
      };
      setState(house);
      setDeviceMemberIdState(member.id);
      setDeviceMemberId(member.id);
      return member;
    };

    const addMember = (input: AddMemberInput): Member | undefined => {
      const name = input.name.trim();
      if (!name) return undefined;
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
      return member;
    };

    const setActiveMember = (id: string) => {
      setState((prev) =>
        prev && prev.members.some((member) => member.id === id)
          ? { ...prev, activeMemberId: id }
          : prev,
      );
    };

    const assignDeviceMember = (id: string) => {
      setState((prev) =>
        prev && prev.members.some((member) => member.id === id)
          ? { ...prev, activeMemberId: id }
          : prev,
      );
      setDeviceMemberIdState(id);
      setDeviceMemberId(id);
    };

    const updateMemberRole = (id: string, householdRole: HouseholdRole) => {
      const target = members.find((member) => member.id === id);
      if (
        target?.householdRole === 'leader' &&
        householdRole !== 'leader' &&
        members.filter((member) => member.householdRole === 'leader')
          .length <= 1
      ) {
        return;
      }
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

    const removeMember = (id: string) => {
      if (activeMember?.householdRole !== 'leader') return;
      if (id === state?.activeMemberId) return;
      const target = members.find((member) => member.id === id);
      if (!target) return;
      const leaderCount = members.filter(
        (member) => member.householdRole === 'leader',
      ).length;
      if (target.householdRole === 'leader' && leaderCount <= 1) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((member) => member.id !== id),
            }
          : prev,
      );
    };

    const renameHousehold = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (activeMember?.householdRole !== 'leader') return;
      setState((prev) =>
        prev ? { ...prev, householdName: trimmed } : prev,
      );
    };

    const addNotice = (input: NoticeInput) => {
      const text = input.text.trim();
      if (!text) return;
      const now = Date.now();
      const notice: HouseNotice = {
        id: makeId('notice'),
        text,
        createdBy: activeMember?.id ?? null,
        createdAt: now,
        duration: input.duration,
        hours:
          input.duration === 'hours' ? (input.hours ?? 2) : undefined,
        expiresAt: computeNoticeExpiry(input.duration, input.hours),
      };
      setState((prev) =>
        prev
          ? { ...prev, notices: [notice, ...(prev.notices ?? [])] }
          : prev,
      );
    };

    const updateNotice = (id: string, input: NoticeInput) => {
      const text = input.text.trim();
      if (!text) return;
      setState((prev) =>
        prev
          ? {
              ...prev,
              notices: (prev.notices ?? []).map((notice) =>
                notice.id === id
                  ? {
                      ...notice,
                      text,
                      duration: input.duration,
                      hours:
                        input.duration === 'hours'
                          ? (input.hours ?? 2)
                          : undefined,
                      expiresAt: computeNoticeExpiry(input.duration, input.hours),
                    }
                  : notice,
              ),
            }
          : prev,
      );
    };

    const deleteNotice = (id: string) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              notices: (prev.notices ?? []).filter(
                (notice) => notice.id !== id,
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
      householdName: state?.householdName ?? 'Mi hogar',
      notices: state?.notices ?? [],
      houseSnapshot: state,
      replaceHouseState: setState,
      homeId: state?.homeId ?? '',
      joinRequested,
      deviceMemberId,
      deviceReady,
      createHousehold,
      addMember,
      setActiveMember,
      assignDeviceMember,
      getMemberById: (id) => members.find((member) => member.id === id),
      updateMemberRole,
      removeMember,
      addCategory,
      renameHousehold,
      addNotice,
      updateNotice,
      deleteNotice,
    };
  }, [state, ready, deviceMemberId, deviceReady, joinRequested]);

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