/**
 * State Inspector Utility
 * 
 * Provides utilities for inspecting and debugging NgRx state in the ATLAS feature module.
 * Supports state snapshots, diff comparison, and integration with Redux DevTools.
 * 
 * @module StateInspector
 */

import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * State snapshot interface
 */
export interface StateSnapshot {
  timestamp: Date;
  state: any;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * State diff result
 */
export interface StateDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  modified: Record<string, any>;
}

/**
 * State Inspector Service
 * 
 * Provides methods for capturing, comparing, and analyzing NgRx state.
 */
export class StateInspector {
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots = 50;

  /**
   * Capture current state snapshot
   * 
   * @param store - NgRx store instance
   * @param action - Optional action name that triggered the snapshot
   * @param metadata - Optional metadata to attach to snapshot
   * @returns Promise resolving to the captured snapshot
   */
  async captureSnapshot(
    store: Store,
    action?: string,
    metadata?: Record<string, any>
  ): Promise<StateSnapshot> {
    const state = await store.pipe(take(1)).toPromise();
    
    const snapshot: StateSnapshot = {
      timestamp: new Date(),
      state: this.deepClone(state),
      action,
      metadata
    };

    this.snapshots.push(snapshot);
    
    // Maintain max snapshots limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get all captured snapshots
   * 
   * @returns Array of state snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get latest snapshot
   * 
   * @returns Latest state snapshot or undefined
   */
  getLatestSnapshot(): StateSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Compare two state snapshots
   * 
   * @param snapshot1 - First snapshot
   * @param snapshot2 - Second snapshot
   * @returns Diff object showing changes
   */
  compareSnapshots(snapshot1: StateSnapshot, snapshot2: StateSnapshot): StateDiff {
    return this.diffObjects(snapshot1.state, snapshot2.state);
  }

  /**
   * Get state changes between two snapshots
   * 
   * @param fromIndex - Starting snapshot index
   * @param toIndex - Ending snapshot index
   * @returns Array of diffs for each change
   */
  getStateChanges(fromIndex: number, toIndex: number): StateDiff[] {
    const diffs: StateDiff[] = [];
    
    for (let i = fromIndex; i < toIndex && i < this.snapshots.length - 1; i++) {
      diffs.push(this.compareSnapshots(this.snapshots[i], this.snapshots[i + 1]));
    }
    
    return diffs;
  }

  /**
   * Export snapshots to JSON
   * 
   * @returns JSON string of all snapshots
   */
  exportSnapshots(): string {
    return JSON.stringify(this.snapshots, null, 2);
  }

  /**
   * Import snapshots from JSON
   * 
   * @param json - JSON string of snapshots
   */
  importSnapshots(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.snapshots = imported.map(s => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to import snapshots:', error);
    }
  }

  /**
   * Search snapshots by action name
   * 
   * @param actionName - Action name to search for
   * @returns Array of matching snapshots
   */
  findSnapshotsByAction(actionName: string): StateSnapshot[] {
    return this.snapshots.filter(s => s.action?.includes(actionName));
  }

  /**
   * Get state at specific path
   * 
   * @param snapshot - State snapshot
   * @param path - Dot-notation path (e.g., 'atlas.deployments.entities')
   * @returns Value at path or undefined
   */
  getStateAtPath(snapshot: StateSnapshot, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], snapshot.state);
  }

  /**
   * Deep clone an object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Diff two objects
   */
  private diffObjects(obj1: any, obj2: any): StateDiff {
    const diff: StateDiff = {
      added: {},
      removed: {},
      modified: {}
    };

    // Find added and modified
    for (const key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        if (!obj1.hasOwnProperty(key)) {
          diff.added[key] = obj2[key];
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          diff.modified[key] = {
            old: obj1[key],
            new: obj2[key]
          };
        }
      }
    }

    // Find removed
    for (const key in obj1) {
      if (obj1.hasOwnProperty(key) && !obj2.hasOwnProperty(key)) {
        diff.removed[key] = obj1[key];
      }
    }

    return diff;
  }
}

/**
 * Global state inspector instance
 */
export const stateInspector = new StateInspector();

/**
 * Redux DevTools configuration helper
 * 
 * Provides configuration for Redux DevTools Extension integration.
 */
export class ReduxDevToolsConfig {
  /**
   * Get Redux DevTools configuration for ATLAS feature
   * 
   * @returns Configuration object for StoreDevtoolsModule
   */
  static getConfig() {
    return {
      name: 'ATLAS Control Plane',
      maxAge: 50, // Maximum number of actions to retain
      logOnly: false, // Enable time-travel debugging
      features: {
        pause: true,
        lock: true,
        persist: true,
        export: true,
        import: 'custom',
        jump: true,
        skip: true,
        reorder: true,
        dispatch: true,
        test: true
      },
      actionSanitizer: (action: any) => {
        // Sanitize sensitive data from actions
        if (action.type?.includes('Auth') || action.type?.includes('Token')) {
          return {
            ...action,
            payload: action.payload ? '[REDACTED]' : undefined
          };
        }
        return action;
      },
      stateSanitizer: (state: any) => {
        // Sanitize sensitive data from state
        if (state.atlas?.auth) {
          return {
            ...state,
            atlas: {
              ...state.atlas,
              auth: '[REDACTED]'
            }
          };
        }
        return state;
      }
    };
  }

  /**
   * Check if Redux DevTools Extension is available
   * 
   * @returns True if extension is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__REDUX_DEVTOOLS_EXTENSION__;
  }
}

/**
 * State inspection helper functions
 */
export const StateInspectionHelpers = {
  /**
   * Log state to console in a formatted way
   * 
   * @param state - State to log
   * @param label - Optional label
   */
  logState(state: any, label = 'State'): void {
    console.group(`🔍 ${label}`);
    console.log('State:', state);
    console.log('JSON:', JSON.stringify(state, null, 2));
    console.groupEnd();
  },

  /**
   * Log state diff to console
   * 
   * @param diff - State diff
   * @param label - Optional label
   */
  logDiff(diff: StateDiff, label = 'State Diff'): void {
    console.group(`📊 ${label}`);
    
    if (Object.keys(diff.added).length > 0) {
      console.log('➕ Added:', diff.added);
    }
    
    if (Object.keys(diff.removed).length > 0) {
      console.log('➖ Removed:', diff.removed);
    }
    
    if (Object.keys(diff.modified).length > 0) {
      console.log('✏️ Modified:', diff.modified);
    }
    
    console.groupEnd();
  },

  /**
   * Create a state visualization table
   * 
   * @param state - State to visualize
   */
  visualizeState(state: any): void {
    const flatState = this.flattenObject(state);
    console.table(flatState);
  },

  /**
   * Flatten nested object for visualization
   */
  flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }
};
