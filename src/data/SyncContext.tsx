import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHousehold } from './HouseholdContext';
import { useTasks } from './TaskContext';
import { useCompras } from './ComprasContext';
import { fetchDoc, isSyncEnabled, pushDoc, SyncDoc } from './supabase';

const META_KEY = 'hogar.sync.v1';
const POLL_MS = 4000;
const PUSH_DELAY_MS = 700;

interface SyncMeta {
  homeId: string;
  updatedAt: number;
}

interface SyncContextValue {
  syncEnabled: boolean;
  lastSyncAt: number;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

function readMeta(raw: string | null): SyncMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    if (typeof parsed.updatedAt === 'number') {
      return { homeId: parsed.homeId ?? '', updatedAt: parsed.updatedAt };
    }
  } catch {
    // ignore
  }
  return null;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const {
    homeId,
    deviceMemberId,
    houseSnapshot,
    replaceHouseState,
  } = useHousehold();
  const { tasksSnapshot, replaceTasksState } = useTasks();
  const { shoppingSnapshot, replaceShoppingState } = useCompras();

  const [meta, setMeta] = useState<SyncMeta>({ homeId: '', updatedAt: 0 });
  const [ready, setReady] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(0);

  const initializedRef = useRef(false);
  const applyingRef = useRef(false);
  const lastAppliedRef = useRef(0);
  const tickInFlightRef = useRef(false);

  const metaRef = useRef(meta);
  metaRef.current = meta;

  const homeIdRef = useRef(homeId);
  homeIdRef.current = homeId;

  const deviceMemberIdRef = useRef(deviceMemberId);
  deviceMemberIdRef.current = deviceMemberId;

  const dataRef = useRef({
    house: houseSnapshot,
    tasks: tasksSnapshot,
    shopping: shoppingSnapshot,
  });
  dataRef.current = {
    house: houseSnapshot,
    tasks: tasksSnapshot,
    shopping: shoppingSnapshot,
  };

  const replaceRef = useRef({
    replaceHouseState,
    replaceTasksState,
    replaceShoppingState,
  });
  replaceRef.current = {
    replaceHouseState,
    replaceTasksState,
    replaceShoppingState,
  };

  const syncEnabled = isSyncEnabled();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: SyncMeta | null = null;
      try {
        stored = readMeta(await AsyncStorage.getItem(META_KEY));
      } catch {
        // ignore
      }
      if (!cancelled) {
        if (stored) setMeta(stored);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !syncEnabled || !homeId) return;
    if (metaRef.current.homeId === homeId) return;
    let cancelled = false;
    (async () => {
      let remoteExists = false;
      try {
        remoteExists = (await fetchDoc(homeId)) !== null;
      } catch {
        remoteExists = false;
      }
      if (cancelled) return;
      const next = {
        homeId,
        updatedAt: remoteExists ? 0 : Date.now(),
      };
      lastAppliedRef.current = 0;
      setMeta(next);
      AsyncStorage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [homeId, ready, syncEnabled]);

  useEffect(() => {
    if (!ready || !syncEnabled) return;
    if (applyingRef.current) return;
    if (!houseSnapshot || !tasksSnapshot || !shoppingSnapshot) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (!homeId) return;
    setMeta({ homeId, updatedAt: Date.now() });
  }, [ready, houseSnapshot, tasksSnapshot, shoppingSnapshot, homeId]);

  const persistMeta = useCallback((next: SyncMeta) => {
    AsyncStorage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const buildDoc = useCallback((remote?: SyncDoc | null): SyncDoc | null => {
    const current = dataRef.current;
    if (!current.house || !current.tasks || !current.shopping) return null;
    let notices = current.house.notices ?? [];
    if (remote?.house && Array.isArray(remote.house.notices)) {
      const seen = new Set(notices.map((notice) => notice.id));
      const merged = [...notices];
      remote.house.notices.forEach((notice) => {
        if (!seen.has(notice.id)) {
          seen.add(notice.id);
          merged.push(notice);
        }
      });
      notices = merged;
    }
    return {
      house: { ...current.house, notices },
      tasks: current.tasks,
      shopping: current.shopping,
      updatedAt: metaRef.current.updatedAt,
    };
  }, []);

  const applyRemote = useCallback(
    (doc: SyncDoc) => {
      const hid = homeIdRef.current;
      const deviceId = deviceMemberIdRef.current;
      applyingRef.current = true;
      const house =
        deviceId && doc.house.members.some((m) => m.id === deviceId)
          ? { ...doc.house, activeMemberId: deviceId }
          : doc.house;
      replaceRef.current.replaceHouseState(house);
      replaceRef.current.replaceTasksState(doc.tasks);
      replaceRef.current.replaceShoppingState(doc.shopping);
      lastAppliedRef.current = doc.updatedAt;
      setMeta({ homeId: hid, updatedAt: doc.updatedAt });
      persistMeta({ homeId: hid, updatedAt: doc.updatedAt });
      setLastSyncAt(Date.now());
      setTimeout(() => {
        applyingRef.current = false;
      }, 0);
    },
    [persistMeta],
  );

  const tick = useCallback(async () => {
    const hid = homeIdRef.current;
    if (!hid) return;
    const localDoc = buildDoc();
    const localAt = metaRef.current.updatedAt;
    const remote = await fetchDoc(hid);
    if (!remote) {
      if (localDoc && localAt > lastAppliedRef.current) {
        const ok = await pushDoc(hid, localDoc);
        if (ok) setLastSyncAt(Date.now());
      }
      return;
    }
    if (localAt > remote.updatedAt) {
      if (localAt > lastAppliedRef.current && localDoc) {
        const ok = await pushDoc(hid, buildDoc(remote)!);
        if (ok) setLastSyncAt(Date.now());
      }
      return;
    }
    if (remote.updatedAt > localAt) {
      applyRemote(remote);
      return;
    }
    setLastSyncAt(Date.now());
  }, [applyRemote, buildDoc]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!ready || !syncEnabled || !homeId) return;
    const run = async () => {
      if (tickInFlightRef.current) return;
      tickInFlightRef.current = true;
      try {
        await tickRef.current();
      } finally {
        tickInFlightRef.current = false;
      }
    };
    run();
    const id = setInterval(run, POLL_MS);
    return () => {
      clearInterval(id);
    };
  }, [ready, syncEnabled, homeId]);

  useEffect(() => {
    if (!ready || !syncEnabled) return;
    const current = metaRef.current;
    if (!current.homeId) return;
    if (current.updatedAt <= lastAppliedRef.current) return;
    const timer = setTimeout(async () => {
      const localDoc = buildDoc();
      if (!localDoc) return;
      let remote: SyncDoc | null = null;
      try {
        remote = await fetchDoc(current.homeId);
      } catch {
        remote = null;
      }
      const doc = remote ? buildDoc(remote) : localDoc;
      const ok = await pushDoc(current.homeId, doc!);
      if (ok) {
        setLastSyncAt(Date.now());
        persistMeta(current);
      }
    }, PUSH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [ready, syncEnabled, meta.updatedAt, meta.homeId, buildDoc, persistMeta]);

  const value = useMemo<SyncContextValue>(
    () => ({ syncEnabled, lastSyncAt }),
    [syncEnabled, lastSyncAt],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}