import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'hogar.clock.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

interface ClockContextValue {
  now: number;
  simulated: boolean;
  advanceWeek: () => void;
  resetClock: () => void;
}

const ClockContext = createContext<ClockContextValue | undefined>(undefined);

export function ClockProvider({ children }: { children: React.ReactNode }) {
  const [simulatedNow, setSimulatedNow] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) setSimulatedNow(parsed);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (simulatedNow === null) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(STORAGE_KEY, String(simulatedNow)).catch(() => {});
    }
  }, [simulatedNow, ready]);

  const value = useMemo<ClockContextValue>(() => {
    const now = simulatedNow ?? Date.now();
    return {
      now,
      simulated: simulatedNow !== null,
      advanceWeek: () =>
        setSimulatedNow((prev) => (prev ?? Date.now()) + 7 * DAY_MS),
      resetClock: () => setSimulatedNow(null),
    };
  }, [simulatedNow]);

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock(): ClockContextValue {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within a ClockProvider');
  }
  return context;
}