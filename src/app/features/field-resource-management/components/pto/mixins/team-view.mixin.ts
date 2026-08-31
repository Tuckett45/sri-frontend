/**
 * TeamViewMixin
 *
 * A TypeScript mixin that encapsulates shared team-view logic for both
 * PTO and Overtime request list components. Provides:
 * - View mode toggling between 'employee' and 'team'
 * - Manager role detection (Admin, Manager, CM, PM, DCOps)
 * - Department filter state management
 * - Observable hooks for loading/error/department options
 *
 * Components using this mixin must implement `onTeamViewActivated()` to
 * dispatch their specific load action (PTO vs Overtime).
 *
 * Requirements: 3.1, 3.7, 4.1, 5.8, 6.5
 */

import { OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';

// ─── Types ──────────────────────────────────────────────────────────────────────

/** View mode for the request list */
export type ViewMode = 'employee' | 'team';

/** Constructor type helper for mixin pattern */
export type Constructor<T = {}> = new (...args: any[]) => T;

/** Roles that grant access to Team View */
const MANAGER_ROLES: string[] = [
  UserRole.Admin,
  UserRole.Manager,
  UserRole.CM,
  UserRole.PM,
  UserRole.DCOps
];

// ─── Mixin ──────────────────────────────────────────────────────────────────────

/**
 * TeamViewMixin adds team-view capabilities to a component class.
 *
 * Usage:
 * ```
 * class PtoRequestListBase implements OnInit { ... }
 * class PtoRequestListComponent extends TeamViewMixin(PtoRequestListBase) { ... }
 * ```
 *
 * The implementing component MUST:
 * 1. Inject `Store` and `AuthService` into its constructor and pass them to `initTeamView()`
 * 2. Call `initTeamView(store, authService)` during `ngOnInit`
 * 3. Override `onTeamViewActivated()` to dispatch the appropriate load action
 * 4. Wire up `departmentOptions$`, `teamLoading$`, and `teamError$` to the appropriate selectors
 */
export function TeamViewMixin<T extends Constructor<OnInit>>(Base: T) {
  return class TeamViewBase extends Base implements OnInit {
    // ─── Properties ───────────────────────────────────────────────────────────

    /** Current view mode: 'employee' (default) or 'team' */
    viewMode: ViewMode = 'employee';

    /** Whether the current user has a manager role that enables Team View */
    isManager = false;

    /** Currently selected department filter (default 'All Departments') */
    selectedDepartment = 'All Departments';

    /**
     * Observable of available department options derived from loaded team data.
     * Must be wired up by the implementing component to the appropriate selector.
     */
    departmentOptions$!: Observable<string[]>;

    /**
     * Observable indicating whether team data is currently loading.
     * Must be wired up by the implementing component to the appropriate selector.
     */
    teamLoading$!: Observable<boolean>;

    /**
     * Observable containing error message if team data load failed, or null.
     * Must be wired up by the implementing component to the appropriate selector.
     */
    teamError$!: Observable<string | null>;

    // ─── Private References ───────────────────────────────────────────────────

    protected _teamViewStore!: Store;
    protected _teamViewAuthService!: AuthService;

    // ─── Initialization ───────────────────────────────────────────────────────

    /**
     * Initialize team view capabilities.
     * Must be called during ngOnInit by the implementing component.
     *
     * @param store NgRx Store instance
     * @param authService AuthService instance for role detection
     */
    initTeamView(store: Store, authService: AuthService): void {
      this._teamViewStore = store;
      this._teamViewAuthService = authService;
      this.isManager = this._detectManagerRole();
    }

    // ─── View Toggle Methods ──────────────────────────────────────────────────

    /**
     * Switch to Team View.
     * Sets view mode to 'team' and calls `onTeamViewActivated()` which the
     * implementing component overrides to dispatch the specific load action.
     *
     * Per Requirement 6.5, this triggers a fresh data fetch each time
     * (no caching between activations).
     */
    switchToTeamView(): void {
      this.viewMode = 'team';
      this.onTeamViewActivated();
    }

    /**
     * Switch back to Employee View.
     * Resets view mode to 'employee' and clears the department filter
     * back to 'All Departments' per Requirement 3.7 / 5.8.
     */
    switchToEmployeeView(): void {
      this.viewMode = 'employee';
      this.selectedDepartment = 'All Departments';
    }

    // ─── Department Filter ────────────────────────────────────────────────────

    /**
     * Update the selected department filter value.
     *
     * @param department The department to filter by, or 'All Departments' for no filtering
     */
    setDepartmentFilter(department: string): void {
      this.selectedDepartment = department;
    }

    // ─── Hook for Subclasses ──────────────────────────────────────────────────

    /**
     * Called when Team View is activated. The implementing component MUST
     * override this method to dispatch the appropriate team load action
     * (e.g., `loadTeamPtoRequests` or `loadTeamOvertimeRequests`).
     *
     * This is called every time Team View is activated (per Requirement 6.5:
     * re-fetch on each activation, no caching).
     */
    onTeamViewActivated(): void {
      // Default no-op — must be overridden by implementing component
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Detects whether the current user has a manager role.
     * Manager roles: Admin, Manager, CM, PM, DCOps
     */
    private _detectManagerRole(): boolean {
      const user = this._teamViewAuthService.getUser();
      if (!user) {
        return false;
      }

      const userRole = user.role || '';
      return MANAGER_ROLES.includes(userRole);
    }
  };
}
