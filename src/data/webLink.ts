import { Member } from './types';

export interface InvitePayload {
  v: 1;
  homeId: string;
  homeName: string;
  members: Member[];
}

export function getUrlParams(): Record<string, string> {
  if (
    typeof window === 'undefined' ||
    !window ||
    typeof window.location === 'undefined' ||
    !window.location ||
    typeof window.location.search !== 'string'
  ) {
    return {};
  }
  try {
    const params: Record<string, string> = {};
    const search = (window.location.search || '').replace(/^\?/, '');
    if (!search) return params;
    search.split('&').forEach((pair) => {
      if (!pair) return;
      const eq = pair.indexOf('=');
      const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
      const rawValue = eq >= 0 ? pair.slice(eq + 1) : 'true';
      const key = decodeURIComponent(rawKey);
      if (!key) return;
      params[key] = decodeURIComponent(rawValue);
    });
    return params;
  } catch {
    return {};
  }
}

export function getUrlParam(key: string): string | null {
  const value = getUrlParams()[key];
  return value === undefined ? null : value;
}

function getOriginPath(): string {
  if (
    typeof window === 'undefined' ||
    !window ||
    typeof window.location === 'undefined' ||
    !window.location
  ) {
    return '';
  }
  return `${window.location.origin}${window.location.pathname}`;
}

export interface InviteUrlInput {
  homeId: string;
  householdName?: string;
  members: Member[];
}

export function buildInviteUrl(home: InviteUrlInput): string {
  const payload: InvitePayload = {
    v: 1,
    homeId: home.homeId,
    homeName: (home.householdName ?? '').trim(),
    members: home.members.map((member) => ({
      id: member.id,
      name: member.name,
      color: member.color,
      householdRole: member.householdRole,
    })),
  };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const base = getOriginPath();
  if (base) {
    return `${base}?invite=${encoded}`;
  }
  return `app-hogar://invite?invite=${encoded}`;
}

export function readInvitePayload(): InvitePayload | null {
  const raw = getUrlParam('invite');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<InvitePayload>;
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.homeId === 'string' &&
      parsed.homeId &&
      Array.isArray(parsed.members) &&
      parsed.members.length > 0
    ) {
      return parsed as InvitePayload;
    }
  } catch {
    // invalid payload; ignore
  }
  return null;
}

export function readJoinContext(): {
  requested: boolean;
  invite: InvitePayload | null;
  homeId: string | null;
} {
  const invite = readInvitePayload();
  const legacyHomeId = getUrlParam('join_home');
  return {
    requested: invite !== null || legacyHomeId !== null,
    invite,
    homeId: invite?.homeId ?? legacyHomeId,
  };
}