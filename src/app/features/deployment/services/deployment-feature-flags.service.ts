import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserPreferencesApiService, UpdateUserPreferencesDTO } from './user-preferences-api.service';

/**
 * Feature flags for deployment workflow
 * Allows users to toggle notifications and other features
 * Now syncs with backend for cross-device support
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
  strictRoleEnforcement: false,
  showRoleColors: true
};

const STORAGE_KEY = 'deployment_feature_flags';

@Injectable({
  providedIn: 'root'
})
export class DeploymentFeatureFlagsService {
  
  private readonly flags = signal<DeploymentFeatureFlags>(this.loadFlags());
  private readonly preferencesApi = inject(UserPreferencesApiService);
  private isOnline = signal<boolean>(navigator.onLine);
  private isSyncing = false;

  constructor() {
    // Monitor online/offline status
    this.setupOnlineStatusMonitoring();
    
    // Load preferences from backend if online
    this.syncFromBackend();
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
   * Syncs with backend if online, falls back to localStorage
   */
  async setFlag<K extends keyof DeploymentFeatureFlags>(key: K, value: boolean): Promise<void> {
    // Update local state immediately for responsive UI
    this.flags.update(current => ({
      ...current,
      [key]: value
    }));
    
    // Save to localStorage as backup
    this.saveFlags();
    
    // Sync with backend
    await this.syncToBackend();
  }

  /**
   * Toggle a specific flag
   */
  async toggleFlag<K extends keyof DeploymentFeatureFlags>(key: K): Promise<boolean> {
    const newValue = !this.flags()[key];
    await this.setFlag(key, newValue);
    return newValue;
  }

  /**
   * Reset all flags to defaults
   */
  async resetFlags(): Promise<void> {
    this.flags.set({ ...DEFAULT_FLAGS });
    this.saveFlags();
    
    // Delete from backend
    if (this.isOnline()) {
      try {
        await firstValueFrom(this.preferencesApi.deleteUserPreferences());
        console.log('✅ Reset preferences on backend');
      } catch (error) {
        console.warn('⚠️ Failed to reset preferences on backend, using local only:', error);
      }
    }
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
   * Force sync from backend
   * Useful when user logs in or comes back online
   */
  async syncFromBackend(): Promise<void> {
    if (!this.isOnline() || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    try {
      const preferences = await firstValueFrom(this.preferencesApi.getUserPreferences());
      
      // Update local state with backend values
      this.flags.set({
        notificationsEnabled: preferences.notificationsEnabled,
        autoAssignEnabled: preferences.autoAssignEnabled,
        strictRoleEnforcement: preferences.strictRoleEnforcement,
        showRoleColors: preferences.showRoleColors
      });
      
      // Update localStorage cache
      this.saveFlags();
      
      console.log('✅ Synced preferences from backend');
    } catch (error) {
      console.warn('⚠️ Failed to sync from backend, using localStorage:', error);
      // Keep using localStorage values on error
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync current flags to backend
   */
  private async syncToBackend(): Promise<void> {
    if (!this.isOnline() || this.isSyncing) {
      console.log('📴 Offline or already syncing - will sync when online');
      return;
    }

    this.isSyncing = true;
    try {
      const currentFlags = this.flags();
      const dto: UpdateUserPreferencesDTO = {
        notificationsEnabled: currentFlags.notificationsEnabled,
        autoAssignEnabled: currentFlags.autoAssignEnabled,
        strictRoleEnforcement: currentFlags.strictRoleEnforcement,
        showRoleColors: currentFlags.showRoleColors
      };
      
      await firstValueFrom(this.preferencesApi.updateUserPreferences(dto));
      console.log('✅ Synced preferences to backend');
    } catch (error) {
      console.warn('⚠️ Failed to sync to backend, saved locally only:', error);
      // Local changes are already saved to localStorage
    } finally {
      this.isSyncing = false;
    }
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
   * Setup online/offline status monitoring
   * Syncs with backend when coming back online
   */
  private setupOnlineStatusMonitoring(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - syncing with backend');
      this.isOnline.set(true);
      this.syncFromBackend();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost - using local cache');
      this.isOnline.set(false);
    });
  }
}

