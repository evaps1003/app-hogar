import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUrlParams } from './webLink';

const STORAGE_KEY = 'hogar.devTools.v1';

const TAP_WINDOW_MS = 1500;
const TAPS_TO_ENABLE = 5;

interface DevToolsContextValue {
  enabled: boolean;
  taps: number;
  tap: () => void;
  setEnabled: (value: boolean) => void;
}

const DevToolsContext = createContext<DevToolsContextValue | undefined>(
  undefined,
);

function persist(value: boolean): void {
  AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
}

export function DevToolsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [taps, setTaps] = useState(0);
  const lastTapAt = useRef(0);

  useEffect(() => {
    const params = getUrlParams();
    if (params.debug === 'true' || params.test === 'true') {
      setEnabledState(true);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled) setEnabledState(value === '1');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DevToolsContextValue>(() => {
    const setEnabled = (next: boolean) => {
      setTaps(0);
      setEnabledState(next);
      persist(next);
    };

    const tap = () => {
      const now = Date.now();
      if (now - lastTapAt.current > TAP_WINDOW_MS) {
        lastTapAt.current = now;
        setTaps(1);
        return;
      }
      lastTapAt.current = now;
      setTaps((prev) => {
        const next = prev + 1;
        if (next >= TAPS_TO_ENABLE) {
          setEnabledState(true);
          persist(true);
          return 0;
        }
        return next;
      });
    };

    return { enabled, taps, tap, setEnabled };
  }, [enabled, taps]);

  return (
    <DevToolsContext.Provider value={value}>
      {children}
    </DevToolsContext.Provider>
  );
}

export function useDevTools(): DevToolsContextValue {
  const context = useContext(DevToolsContext);
  if (!context) {
    throw new Error('useDevTools must be used within a DevToolsProvider');
  }
  return context;
}