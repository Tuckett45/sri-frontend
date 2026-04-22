import { Injectable } from '@angular/core';

/**
 * Handles persistence of FRM (Field Resource Management) state.
 * Primarily used to clear state on logout to prevent data leakage between users.
 */
@Injectable({
  providedIn: 'root'
})
export class StatePersistenceService {
  private readonly storagePrefix = 'frm_state_';

  clearPersistedState(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.storagePrefix));
    keys.forEach(k => localStorage.removeItem(k));
  }

  saveState(key: string, value: any): void {
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or unavailable — fail silently
    }
  }

  loadState<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${this.storagePrefix}${key}`);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }
}
