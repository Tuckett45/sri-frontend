import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Notification preferences for a specific notification type
 */
export interface NotificationTypePreferences {
  /** Whether toast notifications are enabled */
  toastEnabled: boolean;
  
  /** Whether push notifications are enabled */
  pushEnabled: boolean;
  
  /** Default toast type to use */
  defaultToastType: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Complete notification preferences for all notification types
 */
export interface NotificationPreferences {
  /** Magic 8 Ball notification preferences */
  magic8Ball: NotificationTypePreferences;
  
  /** Deployment notification preferences */
  deployment: NotificationTypePreferences;
}

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  magic8Ball: {
    toastEnabled: true,
    pushEnabled: false,
    defaultToastType: 'info'
  },
  deployment: {
    toastEnabled: true,
    pushEnabled: false,
    defaultToastType: 'info'
  }
};

/**
 * Service to manage user notification preferences
 * 
 * This service provides a centralized way to manage notification preferences
 * for different notification types (Magic 8 Ball, deployments, etc.). Preferences
 * are automatically persisted to localStorage and synchronized across the application
 * using RxJS observables.
 * 
 * Features:
 * - Per-type notification preferences (toast/push enabled, default toast type)
 * - Automatic localStorage persistence
 * - Observable-based updates for reactive UI
 * - Default preferences with graceful fallback
 * - Type-safe preference management
 * 
 * @example
 * ```typescript
 * // Subscribe to preference changes
 * preferencesService.preferences.subscribe(prefs => {
 *   console.log('Magic 8 Ball toast enabled:', prefs.magic8Ball.toastEnabled);
 * });
 * 
 * // Update preferences
 * preferencesService.updatePreferences('magic-8-ball', {
 *   toastEnabled: true,
 *   pushEnabled: false
 * });
 * 
 * // Reset to defaults
 * preferencesService.resetPreferences('magic-8-ball');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private readonly storageKey = 'sri-notification-preferences';
  private readonly preferences$ = new BehaviorSubject<NotificationPreferences>(
    this.loadPreferences()
  );

  /**
   * Observable of current notification preferences
   */
  get preferences(): Observable<NotificationPreferences> {
    return this.preferences$.asObservable();
  }

  /**
   * Get current preferences synchronously
   */
  getCurrentPreferences(): NotificationPreferences {
    return this.preferences$.value;
  }

  /**
   * Get preferences for a specific notification type
   * @param type The notification type ('magic-8-ball' or 'deployment')
   * @returns The preferences for the specified type
   */
  getPreferences(type: 'magic-8-ball' | 'deployment'): NotificationTypePreferences {
    const prefs = this.preferences$.value;
    return type === 'magic-8-ball' ? prefs.magic8Ball : prefs.deployment;
  }

  /**
   * Update preferences for a specific notification type
   * @param type The notification type to update
   * @param preferences Partial preferences to update (only specified fields will be changed)
   */
  updatePreferences(
    type: 'magic-8-ball' | 'deployment',
    preferences: Partial<NotificationTypePreferences>
  ): void {
    const currentPrefs = this.preferences$.value;
    const typeKey = type === 'magic-8-ball' ? 'magic8Ball' : 'deployment';
    
    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      [typeKey]: {
        ...currentPrefs[typeKey],
        ...preferences
      }
    };

    this.preferences$.next(updatedPrefs);
    this.savePreferences(updatedPrefs);
  }

  /**
   * Reset preferences to defaults
   * @param type Optional notification type to reset. If not provided, resets all preferences
   */
  resetPreferences(type?: 'magic-8-ball' | 'deployment'): void {
    if (type) {
      // Reset specific type
      const currentPrefs = this.preferences$.value;
      const typeKey = type === 'magic-8-ball' ? 'magic8Ball' : 'deployment';
      const defaultTypePrefs = DEFAULT_PREFERENCES[typeKey];
      
      const updatedPrefs: NotificationPreferences = {
        ...currentPrefs,
        [typeKey]: { ...defaultTypePrefs }
      };

      this.preferences$.next(updatedPrefs);
      this.savePreferences(updatedPrefs);
    } else {
      // Reset all preferences
      const resetPrefs = { ...DEFAULT_PREFERENCES };
      this.preferences$.next(resetPrefs);
      this.savePreferences(resetPrefs);
    }
  }

  /**
   * Load preferences from localStorage
   * Returns default preferences if none are found or if loading fails
   */
  private loadPreferences(): NotificationPreferences {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_PREFERENCES };
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      
      if (!stored) {
        // No preferences found, save and return defaults
        this.savePreferences(DEFAULT_PREFERENCES);
        return { ...DEFAULT_PREFERENCES };
      }

      const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
      
      // Merge with defaults to ensure all fields are present
      const preferences: NotificationPreferences = {
        magic8Ball: {
          ...DEFAULT_PREFERENCES.magic8Ball,
          ...(parsed.magic8Ball || {})
        },
        deployment: {
          ...DEFAULT_PREFERENCES.deployment,
          ...(parsed.deployment || {})
        }
      };

      return preferences;
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(preferences: NotificationPreferences): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const serialized = JSON.stringify(preferences);
      window.localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }
}
