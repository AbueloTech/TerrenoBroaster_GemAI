/**
 * Safe localStorage wrapper that gracefully handles blocked storage in iframes,
 * private browsing modes, or third-party cookie restrictions.
 * Falls back to an in-memory dictionary if localStorage throws SecurityError or DOMException.
 */
const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Storage restricted or blocked in iframe
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },

  setItem: (key: string, value: string): void => {
    try {
      memoryStore[key] = value;
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Quota exceeded or iframe security restriction; memoryStore has it
    }
  },

  removeItem: (key: string): void => {
    try {
      delete memoryStore[key];
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },

  clear: (): void => {
    try {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
  },
};

