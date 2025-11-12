import { Injectable, Signal, computed, signal } from '@angular/core';

export type FeatureFlagKey = 
  | 'notifications' 
  | 'liveUpdates' 
  | 'offlineMode'
  | 'roleBasedWorkflow'
  | 'deploymentNotifications'
  | 'signOffRequired';

export interface FeatureFlagView {
  readonly key: FeatureFlagKey;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly isDefault: boolean;
}

interface FeatureFlagDefinition {
  readonly key: FeatureFlagKey;
  readonly label: string;
  readonly description: string;
  readonly defaultValue: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly storageKey = 'sri-feature-flags';

  private readonly definitions: FeatureFlagDefinition[] = [
    {
      key: 'notifications',
      label: 'Notifications',
      description: 'Enable in-app and email notifications to keep teams aware of project changes.',
      defaultValue: true
    },
    {
      key: 'liveUpdates',
      label: 'Live Updates',
      description: 'Turn on live-refresh dashboards and tables without manual reloads.',
      defaultValue: false
    },
    {
      key: 'offlineMode',
      label: 'Offline Mode',
      description: 'Allow limited access when internet connectivity is unavailable.',
      defaultValue: false
    },
    {
      key: 'roleBasedWorkflow',
      label: 'Role-Based Deployment Workflow',
      description: 'Enable role-based access control and color-coded UI for deployment phases based on user roles (DE, DC Ops, Vendor Rep, SRI Tech).',
      defaultValue: true
    },
    {
      key: 'deploymentNotifications',
      label: 'Deployment Workflow Notifications',
      description: 'Enable real-time notifications for deployment assignments, sign-off requests, issues, and completion events.',
      defaultValue: true
    },
    {
      key: 'signOffRequired',
      label: 'Require Sign-Offs for Deployment Handoff',
      description: 'Enforce three-party sign-off workflow (Vendor Rep, SRI Tech, Deployment Engineer) before completing deployment handoff phase.',
      defaultValue: true
    }
  ];

  private readonly defaultState: Record<FeatureFlagKey, boolean> = this.definitions.reduce(
    (acc, def) => {
      acc[def.key] = def.defaultValue;
      return acc;
    },
    {} as Record<FeatureFlagKey, boolean>
  );

  private readonly flagState = signal<Record<FeatureFlagKey, boolean>>(this.loadInitialState());

  readonly flags = computed<FeatureFlagView[]>(() =>
    this.definitions.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      enabled: this.flagState()[def.key],
      isDefault: def.defaultValue === this.flagState()[def.key]
    }))
  );

  readonly isDirty = computed(() =>
    (Object.keys(this.flagState()) as FeatureFlagKey[]).some(
      (key) => this.flagState()[key] !== this.defaultState[key]
    )
  );

  flagEnabled(key: FeatureFlagKey): Signal<boolean> {
    return computed(() => this.flagState()[key]);
  }

  toggleFlag(key: FeatureFlagKey): void {
    this.updateState(key, !this.flagState()[key]);
  }

  setFlag(key: FeatureFlagKey, enabled: boolean): void {
    this.updateState(key, enabled);
  }

  reset(): void {
    this.flagState.set({ ...this.defaultState });
    this.persist(this.flagState());
  }

  private updateState(key: FeatureFlagKey, enabled: boolean): void {
    this.flagState.update((state) => {
      const next = { ...state, [key]: enabled };
      this.persist(next);
      return next;
    });
  }

  private loadInitialState(): Record<FeatureFlagKey, boolean> {
    if (typeof window === 'undefined') {
      return { ...this.defaultState };
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (!stored) {
        this.persist(this.defaultState);
        return { ...this.defaultState };
      }

      const parsed = JSON.parse(stored) as Partial<Record<FeatureFlagKey, boolean>>;
      return {
        ...this.defaultState,
        ...parsed
      };
    } catch {
      return { ...this.defaultState };
    }
  }

  private persist(state: Record<FeatureFlagKey, boolean>): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
