import { Injectable, signal } from '@angular/core';

/**
 * Feature flags for deployment workflow
 * Allows users to toggle notifications and other features
 */
export interface DeploymentFeatureFlags {
  notificationsEnabled: boolean;
  autoAssignEnabled: boolean;
  strictRoleEnforcement: boolean;
  showRoleColors: boolean;
}

const DEFAULT_FLAGS: DeploymentFeatureFlags = {
  notificationsEnabled: true,
  autoAssignEnabled: true,
  strictRoleEnforcement: false, // Can be enabled for strict role checks
  showRoleColors: true
};

const STORAGE_KEY = 'deployment_feature_flags';

@Injectable({
  providedIn: 'root'
})
export class DeploymentFeatureFlagsService {
  
  private readonly flags = signal<DeploymentFeatureFlags>(this.loadFlags());

  constructor() {
    // Auto-save whenever flags change
    this.watchForChanges();
  }

  /**
   * Get all feature flags as a signal
   */
  getFlags() {
    return this.flags.asReadonly();
  }

  /**
   * Get a specific flag value
   */
  getFlag<K extends keyof DeploymentFeatureFlags>(key: K): boolean {
    return this.flags()[key];
  }

  /**
   * Set a specific flag
   */
  setFlag<K extends keyof DeploymentFeatureFlags>(key: K, value: boolean): void {
    this.flags.update(current => ({
      ...current,
      [key]: value
    }));
    this.saveFlags();
  }

  /**
   * Toggle a specific flag
   */
  toggleFlag<K extends keyof DeploymentFeatureFlags>(key: K): boolean {
    const newValue = !this.flags()[key];
    this.setFlag(key, newValue);
    return newValue;
  }

  /**
   * Reset all flags to defaults
   */
  resetFlags(): void {
    this.flags.set({ ...DEFAULT_FLAGS });
    this.saveFlags();
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return this.getFlag('notificationsEnabled');
  }

  /**
   * Check if role colors should be shown in UI
   */
  shouldShowRoleColors(): boolean {
    return this.getFlag('showRoleColors');
  }

  /**
   * Check if strict role enforcement is enabled
   */
  isStrictRoleEnforcementEnabled(): boolean {
    return this.getFlag('strictRoleEnforcement');
  }

  /**
   * Check if auto-assignment is enabled
   */
  isAutoAssignEnabled(): boolean {
    return this.getFlag('autoAssignEnabled');
  }

  /**
   * Load flags from localStorage
   */
  private loadFlags(): DeploymentFeatureFlags {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<DeploymentFeatureFlags>;
        return { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load deployment feature flags:', error);
    }
    return { ...DEFAULT_FLAGS };
  }

  /**
   * Save flags to localStorage
   */
  private saveFlags(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.flags()));
    } catch (error) {
      console.warn('Failed to save deployment feature flags:', error);
    }
  }

  /**
   * Watch for changes (for future reactive features)
   */
  private watchForChanges(): void {
    // Future: Could emit events or trigger side effects
  }
}

