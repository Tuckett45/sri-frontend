import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';

import { EodEntry } from '../../../../models/deployment-checklist.model';
import * as ChecklistActions from '../../../../state/deployment-checklist/checklist.actions';

/**
 * EOD Report Phase Component
 *
 * Third phase of the Deployment Checklist workflow. Displays existing EOD
 * entries in reverse chronological order and provides an "Add EOD Report"
 * button (visible only to users with `canSubmitEOD` permission) that renders
 * the EodEntryFormComponent for creating new entries.
 *
 * EOD entries are append-only — this phase does NOT use draft auto-save.
 *
 * Requirements: 6.1, 6.12, 6.13, 6.14, 6.15, 6.16
 */
@Component({
  selector: 'app-eod-report-phase',
  templateUrl: './eod-report-phase.component.html',
  styleUrls: ['./eod-report-phase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EodReportPhaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input() jobId!: string;
  @Input() entries: EodEntry[] = [];
  @Input() canEdit = false;
  @Input() canSubmitEOD = false;

  @Output() formDirty = new EventEmitter<boolean>();

  /** Entries sorted in reverse chronological order for display */
  sortedEntries: EodEntry[] = [];

  /** Controls visibility of the new entry form */
  showNewEntryForm = false;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.sortEntries();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.sortEntries();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Entry Sorting
  // ---------------------------------------------------------------------------

  private sortEntries(): void {
    if (!this.entries || this.entries.length === 0) {
      this.sortedEntries = [];
      return;
    }

    this.sortedEntries = [...this.entries].sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      // If same date, sort by submittedAt descending
      const submittedA = new Date(a.submittedAt).getTime();
      const submittedB = new Date(b.submittedAt).getTime();
      return submittedB - submittedA;
    });
  }

  // ---------------------------------------------------------------------------
  // Add Entry
  // ---------------------------------------------------------------------------

  onAddEntry(): void {
    this.showNewEntryForm = true;
  }

  onEntrySaved(entry: EodEntry): void {
    this.store.dispatch(ChecklistActions.addEodEntry({
      jobId: this.jobId,
      entry
    }));

    this.showNewEntryForm = false;
    this.formDirty.emit(false);
  }

  onEntryFormCancel(): void {
    this.showNewEntryForm = false;
    this.formDirty.emit(false);
  }

  onEntryFormDirty(dirty: boolean): void {
    this.formDirty.emit(dirty);
  }

  // ---------------------------------------------------------------------------
  // Display Helpers
  // ---------------------------------------------------------------------------

  /**
   * Formats a date string for display.
   */
  formatDate(dateStr: string): string {
    if (!dateStr) {
      return '';
    }
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Formats a time string (HH:mm) for display.
   */
  formatTime(timeStr: string): string {
    if (!timeStr) {
      return '';
    }
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  }

  /**
   * TrackBy function for ngFor on entries.
   */
  trackByEntryId(_index: number, entry: EodEntry): string {
    return entry.id;
  }
}
