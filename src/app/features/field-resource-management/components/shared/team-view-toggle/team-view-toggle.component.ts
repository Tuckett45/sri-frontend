import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

export type ViewMode = 'employee' | 'team';

/**
 * Team View Toggle Component
 *
 * A reusable toggle component that allows managers to switch between
 * "My Requests" (Employee View) and "Team Requests" (Team View).
 * Uses Angular Material's mat-button-toggle-group for consistent UX.
 *
 * @example
 * <frm-team-view-toggle
 *   [viewMode]="currentViewMode"
 *   (viewModeChange)="onViewModeChange($event)">
 * </frm-team-view-toggle>
 */
@Component({
  selector: 'frm-team-view-toggle',
  templateUrl: './team-view-toggle.component.html',
  styleUrls: ['./team-view-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamViewToggleComponent {
  @Input() viewMode: ViewMode = 'employee';
  @Output() viewModeChange = new EventEmitter<ViewMode>();

  /**
   * Handles toggle change and emits the new view mode.
   */
  onViewModeChange(mode: ViewMode): void {
    if (mode !== this.viewMode) {
      this.viewModeChange.emit(mode);
    }
  }
}
