const PREFIX = 'repomind:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (e) {
    /* ignore */
  }
}

export function loadToken() {
  try {
    return localStorage.getItem(PREFIX + 'token') || '';
  } catch (e) {
    return '';
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(PREFIX + 'token', token);
    else localStorage.removeItem(PREFIX + 'token');
  } catch (e) {
    /* ignore */
  }
}

export function loadCached(owner, name) {
  const entry = load('cache:' + (owner + '/' + name).toLowerCase(), null);
  if (!entry || !entry.time) return null;
  return entry;
}

export function saveCached(owner, name, result) {
  const key = 'cache:' + (owner + '/' + name).toLowerCase();
  const ok = save(key, { time: Date.now(), result: result });
  if (!ok) {
    try {
      const stale = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(PREFIX + 'cache:') === 0 && k !== PREFIX + key) stale.push(k);
      }
      stale.forEach((k) => localStorage.removeItem(k));
      save(key, { time: Date.now(), result: result });
    } catch (e) {
      /* ignore */
    }
  }
}
