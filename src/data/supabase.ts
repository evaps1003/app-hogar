import { HouseData, ShoppingStorage, TasksStorage } from './types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './syncConfig';

export interface SyncDoc {
  house: HouseData;
  tasks: TasksStorage;
  shopping: ShoppingStorage;
  updatedAt: number;
}

export function isSyncEnabled(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}

function authHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export async function fetchDoc(homeId: string): Promise<SyncDoc | null> {
  if (!isSyncEnabled()) return null;
  const url =
    `${SUPABASE_URL}/homes?home_id=eq.${encodeURIComponent(homeId)}` +
    '&select=data';
  try {
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ data?: SyncDoc }>;
    const doc = rows[0]?.data;
    if (!doc || typeof doc !== 'object') return null;
    if (typeof doc.updatedAt !== 'number') return null;
    return doc;
  } catch {
    return null;
  }
}

export async function pushDoc(homeId: string, doc: SyncDoc): Promise<boolean> {
  if (!isSyncEnabled()) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/homes`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ home_id: homeId, data: doc }]),
    });
    return response.ok;
  } catch {
    return false;
  }
}