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

export function buildInviteUrl(homeId: string): string {
  const base = getOriginPath();
  if (base) {
    return `${base}?join_home=${encodeURIComponent(homeId)}`;
  }
  return `app-hogar://invite?join_home=${encodeURIComponent(homeId)}`;
}