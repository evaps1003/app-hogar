import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUrlParam } from './webLink';

export const DEVICE_MEMBER_KEY = 'my_device_member_id';

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getWebStorage(): WebStorageLike | null {
  try {
    const g = globalThis as unknown as {
      localStorage?: WebStorageLike;
    };
    const storage = g.localStorage;
    if (
      storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function'
    ) {
      return storage;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getDeviceMemberId(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(DEVICE_MEMBER_KEY);
    if (value) return value;
  } catch {
    // fall back to the web storage below
  }
  const storage = getWebStorage();
  if (!storage) return null;
  try {
    return storage.getItem(DEVICE_MEMBER_KEY);
  } catch {
    return null;
  }
}

export async function setDeviceMemberId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DEVICE_MEMBER_KEY, id);
  } catch {
    // the web storage below may still be writable
  }
  const storage = getWebStorage();
  if (!storage) return;
  try {
    storage.setItem(DEVICE_MEMBER_KEY, id);
  } catch {
    // ignore
  }
}

export async function clearDeviceMemberId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEVICE_MEMBER_KEY);
  } catch {
    // ignore
  }
  const storage = getWebStorage();
  if (!storage) return;
  try {
    storage.removeItem(DEVICE_MEMBER_KEY);
  } catch {
    // ignore
  }
}

export function getInviteHomeIdFromUrl(): string | null {
  return getUrlParam('join_home');
}