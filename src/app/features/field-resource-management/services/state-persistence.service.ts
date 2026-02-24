/**
 * State Persistence Service
 * 
 * Manages state persistence lifecycle:
 * - Clears persisted state on logout
 * - Provides utilities for manual state management
 * - Handles storage quota errors
 */

import { Injectable } from '@angular/core';
import { clearStoredState } from '../state/meta-reducers/storage-sync.meta-reducer';

@Injectable({
  providedIn: 'root'
})
export class StatePersistenceService {
  private readonly STORAGE_KEY = 'frm_time_entry_state';

  /**
   * Clear all persisted state
   * Should be called on logout to prevent data leakage between users
   */
  clearPersistedState(): void {
    clearStoredState();
  }

  /**
   * Check if there is persisted state available
   */
  hasPersistedState(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored !== null;
    } catch (error) {
      console.error('Failed to check persisted state:', error);
      return false;
    }
  }

  /**
   * Get information about persisted state
   */
  getPersistedStateInfo(): { hasActiveEntry: boolean; timestamp: number | null } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return { hasActiveEntry: false, timestamp: null };
      }

      const parsed = JSON.parse(stored);
      const hasActiveEntry = parsed.timeEntries?.activeEntry !== null;
      const timestamp = parsed.timestamp || null;

      return { hasActiveEntry, timestamp };
    } catch (error) {
      console.error('Failed to get persisted state info:', error);
      return { hasActiveEntry: false, timestamp: null };
    }
  }

  /**
   * Check storage quota and available space
   */
  checkStorageQuota(): { used: number; available: number; percentage: number } {
    try {
      // Estimate storage usage
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Most browsers allow 5-10MB for localStorage
      const available = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / available) * 100;

      return { used, available, percentage };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}
