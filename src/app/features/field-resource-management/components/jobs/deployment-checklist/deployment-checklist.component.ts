import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map, pairwise, startWith, filter } from 'rxjs/operators';

import { Job } from '../../../models/job.model';
import {
  ChecklistStatus,
  DeploymentChecklist,
  PhaseStatus
} from '../../../models/deployment-checklist.model';
import * as ChecklistActions from '../../../state/deployment-checklist/checklist.actions';
import {
  selectChecklist,
  selectChecklistLoading,
  selectChecklistSaving,
  selectChecklistError,
  selectChecklistStatus,
  selectJobDetailsPhaseStatus,
  selectPreInstallationPhaseStatus,
  selectEodReportPhaseStatus,
  selectCloseOutPhaseStatus,
  selectJobDetailsPhase,
  selectPreInstallationPhase,
  selectEodEntries,
  selectCloseOutPhase
} from '../../../state/deployment-checklist/checklist.selectors';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { FrmSignalRService, ConnectionStatus } from '../../../services/frm-signalr.service';
import { DeploymentChecklistService } from '../../../services/deployment-checklist.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../shared/confirm-dialog/confirm-dialog.component';

/**
 * Represents a phase tab in the checklist navigation.
 */
export interface PhaseTab {
  label: string;
  phase: 'jobDetails' | 'preInstallation' | 'eodReports' | 'closeOut';
}

/**
 * Deployment Checklist Container Component
 *
 * Orchestrates the four-phase deployment checklist workflow.
 * Manages tab navigation, permission flags, loading/error states,
 * unsaved-changes confirmation, and print/export actions.
 *
 * Requirements: 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 8.2, 8.3, 8.4, 10.1, 12.1, 12.3
 */
@Component({
  selector: 'app-deployment-checklist',
  templateUrl: './deployment-checklist.component.html',
  styleUrls: ['./deployment-checklist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeploymentChecklistComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;
  @Input() job!: Job;
  @Input() initialPhaseIndex = 0;

  /** Observable streams from the NgRx store */
  checklist$!: Observable<DeploymentChecklist | null>;
  checklistStatus$!: Observable<ChecklistStatus>;
  loading$!: Observable<boolean>;
  saving$!: Observable<boolean>;
  error$!: Observable<string | null>;

  /** Phase data selectors */
  jobDetailsData$ !: Observable<any>;
  preInstallationData$ !: Observable<any>;
  eodEntries$ !: Observable<any>;
  closeOutData$ !: Observable<any>;

  /** Phase status selectors */
  jobDetailsStatus$!: Observable<PhaseStatus>;
  preInstallationStatus$!: Observable<PhaseStatus>;
  eodReportStatus$!: Observable<PhaseStatus>;
  closeOutStatus$!: Observable<PhaseStatus>;

  /** Permission flags */
  canEdit$!: Observable<boolean>;
  canSubmitEOD$!: Observable<boolean>;

  /** SignalR connection status */
  connectionStatus$!: Observable<ConnectionStatus>;
  isDisconnected$!: Observable<boolean>;

  /** Tab state */
  selectedPhaseIndex = 0;
  phases: PhaseTab[] = [
    { label: 'Job Details', phase: 'jobDetails' },
    { label: 'Pre-Installation', phase: 'preInstallation' },
    { label: 'End of Day Reports', phase: 'eodReports' },
    { label: 'Close-Out', phase: 'closeOut' }
  ];

  /** Dirty form tracking — set by child phase components via (formDirty) output */
  isFormDirty = false;

  /** Enum references for template */
  PhaseStatus = PhaseStatus;
  ChecklistStatus = ChecklistStatus;
  ConnectionStatus = ConnectionStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private permissionService: FrmPermissionService,
    private signalRService: FrmSignalRService,
    private checklistService: DeploymentChecklistService
  ) {}

  ngOnInit(): void {
    // Dispatch load action
    this.store.dispatch(ChecklistActions.loadChecklist({ jobId: this.jobId }));

    // Apply initial phase index from deep-link
    if (this.initialPhaseIndex >= 0 && this.initialPhaseIndex < this.phases.length) {
      this.selectedPhaseIndex = this.initialPhaseIndex;
    }

    // Wire up store selectors
    this.checklist$ = this.store.select(selectChecklist);
    this.checklistStatus$ = this.store.select(selectChecklistStatus);
    this.loading$ = this.store.select(selectChecklistLoading);
    this.saving$ = this.store.select(selectChecklistSaving);
    this.error$ = this.store.select(selectChecklistError);

    // Phase data
    this.jobDetailsData$ = this.store.select(selectJobDetailsPhase);
    this.preInstallationData$ = this.store.select(selectPreInstallationPhase);
    this.eodEntries$ = this.store.select(selectEodEntries);
    this.closeOutData$ = this.store.select(selectCloseOutPhase);

    // Phase statuses
    this.jobDetailsStatus$ = this.store.select(selectJobDetailsPhaseStatus);
    this.preInstallationStatus$ = this.store.select(selectPreInstallationPhaseStatus);
    this.eodReportStatus$ = this.store.select(selectEodReportPhaseStatus);
    this.closeOutStatus$ = this.store.select(selectCloseOutPhaseStatus);

    // Permission flags derived from the user's role
    this.canEdit$ = this.authService.getUserRole$().pipe(
      map(role => this.permissionService.hasPermission(role, 'canEditDeploymentChecklist'))
    );
    this.canSubmitEOD$ = this.authService.getUserRole$().pipe(
      map(role => this.permissionService.hasPermission(role, 'canSubmitEODReport'))
    );

    // SignalR connection monitoring
    this.connectionStatus$ = this.signalRService.connectionStatus$;
    this.isDisconnected$ = this.connectionStatus$.pipe(
      map(status => status !== ConnectionStatus.Connected)
    );

    // Resynchronize checklist data after SignalR reconnection
    this.signalRService.connectionStatus$.pipe(
      startWith(ConnectionStatus.Disconnected),
      pairwise(),
      filter(([prev, curr]) => prev !== ConnectionStatus.Connected && curr === ConnectionStatus.Connected),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.store.dispatch(ChecklistActions.loadChecklist({ jobId: this.jobId }));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles tab selection with unsaved-changes confirmation.
   * If the current phase form is dirty, prompts the user before switching.
   */
  onTabChange(newIndex: number): void {
    if (this.isFormDirty) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Do you want to discard them and switch tabs?',
          confirmText: 'Discard Changes',
          cancelText: 'Cancel',
          variant: 'warning'
        } as ConfirmDialogData
      });

      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(confirmed => {
          if (confirmed) {
            this.isFormDirty = false;
            this.selectedPhaseIndex = newIndex;
          }
          // If cancelled, the tab stays on the current index (no action needed
          // because we use selectedPhaseIndex binding, not the event default).
        });
    } else {
      this.selectedPhaseIndex = newIndex;
    }
  }

  /**
   * Called by child phase components to report dirty state.
   */
  onFormDirtyChange(dirty: boolean): void {
    this.isFormDirty = dirty;
  }

  /**
   * Retries loading the checklist after an error.
   */
  retryLoad(): void {
    this.store.dispatch(ChecklistActions.loadChecklist({ jobId: this.jobId }));
  }

  /**
   * Triggers browser print dialog.
   */
  onPrint(): void {
    window.print();
  }

  /**
   * Exports the checklist as a PDF and triggers download.
   */
  onExportPdf(): void {
    this.checklistService.exportPdf(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `deployment-checklist-${this.jobId}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
          this.snackBar.open('PDF exported successfully', 'Close', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Failed to export PDF. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  /**
   * Returns the status observable for a given phase index.
   */
  getPhaseStatus$(index: number): Observable<PhaseStatus> {
    switch (index) {
      case 0: return this.jobDetailsStatus$;
      case 1: return this.preInstallationStatus$;
      case 2: return this.eodReportStatus$;
      case 3: return this.closeOutStatus$;
      default: return this.jobDetailsStatus$;
    }
  }

  /**
   * Returns a CSS class for a given PhaseStatus value.
   */
  getPhaseStatusClass(status: PhaseStatus): string {
    switch (status) {
      case PhaseStatus.Completed: return 'status-completed';
      case PhaseStatus.InProgress: return 'status-in-progress';
      case PhaseStatus.NotStarted:
      default: return 'status-not-started';
    }
  }

  /**
   * Returns a display label for a given PhaseStatus value.
   */
  getPhaseStatusLabel(status: PhaseStatus): string {
    switch (status) {
      case PhaseStatus.Completed: return 'Completed';
      case PhaseStatus.InProgress: return 'In Progress';
      case PhaseStatus.NotStarted:
      default: return 'Not Started';
    }
  }

  /**
   * Returns a CSS class for the overall ChecklistStatus.
   */
  getChecklistStatusClass(status: ChecklistStatus): string {
    switch (status) {
      case ChecklistStatus.Completed: return 'status-completed';
      case ChecklistStatus.InProgress: return 'status-in-progress';
      case ChecklistStatus.NotStarted:
      default: return 'status-not-started';
    }
  }

  /**
   * Returns a display label for the overall ChecklistStatus.
   */
  getChecklistStatusLabel(status: ChecklistStatus): string {
    switch (status) {
      case ChecklistStatus.Completed: return 'Completed';
      case ChecklistStatus.InProgress: return 'In Progress';
      case ChecklistStatus.NotStarted:
      default: return 'Not Started';
    }
  }
}
