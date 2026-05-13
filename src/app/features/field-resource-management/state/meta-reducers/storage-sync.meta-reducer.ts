/**
 * Storage Sync Meta-Reducer
 * 
 * Persists critical state to localStorage to survive page refreshes and browser closures.
 * This is essential for time tracking to prevent data loss when users navigate away.
 * 
 * Features:
 * - Persists time entry state (especially active entries)
 * - Rehydrates state on app initialization
 * - Handles storage errors gracefully
 * - Only persists necessary data to minimize storage usage
 */

import { ActionReducer, MetaReducer, Action } from '@ngrx/store';

const STORAGE_KEY = 'frm_time_entry_state';

/**
 * Load state from localStorage
 */
function loadFromStorage(): any {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    
    // Check if stored state is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - parsed.timestamp > maxAge) {
      console.warn('Stored state is too old, clearing...');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return null;
  }
}

/**
 * Clear stored state
 */
export function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored state:', error);
  }
}

/**
 * Storage Sync Meta-Reducer
 * 
 * Intercepts all actions and persists state after each update.
 * On app initialization, rehydrates state from localStorage.
 */
export function storageSyncMetaReducer(reducer: ActionReducer<any>): ActionReducer<any> {
  let isInitialized = false;

  return (state: any, action: Action) => {
    // On first run, try to rehydrate state from storage
    if (!isInitialized) {
      isInitialized = true;
      const storedState = loadFromStorage();
      
      if (storedState && storedState.timeEntries) {
        console.log('Rehydrating time entry state from localStorage', storedState.timeEntries);
        // Merge the stored time entries state with the current state
        state = {
          ...state,
          entities: storedState.timeEntries.entities || state?.entities || {},
          ids: storedState.timeEntries.ids || state?.ids || [],
          activeEntry: storedState.timeEntries.activeEntry || state?.activeEntry || null,
          loading: state?.loading || false,
          error: state?.error || null
        };
      }
    }

    // Run the reducer
    const nextState = reducer(state, action);

    // Save state after actions that modify time entries
    const timeEntryActions = [
      '[Time Entry] Clock In Success',
      '[Time Entry] Clock Out Success',
      '[Time Entry] Update Time Entry Success',
      '[Time Entry] Load Time Entries Success',
      '[Time Entry] Load Active Entry Success',
      '[Time Entry] Clear Active Entry'
    ];

    if (timeEntryActions.includes(action.type)) {
      // Save the feature state (not the root state)
      const stateToSave = {
        timeEntries: {
          entities: nextState.entities || {},
          ids: nextState.ids || [],
          activeEntry: nextState.activeEntry || null
        },
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('Saved time entry state to localStorage', stateToSave);
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    }

    return nextState;
  };
}

/**
 * Meta-reducer factory for AOT compilation
 */
export const metaReducers: MetaReducer<any>[] = [storageSyncMetaReducer];
