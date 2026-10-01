import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Crew } from '../../../models/crew.model';

/**
 * Data passed into the Crew Export dialog.
 */
export interface CrewExportDialogData {
  /** All crews available for selection (already role-scoped/filtered by the caller). */
  crews: Crew[];
  /** Export format being requested, used only for display. */
  format: 'csv' | 'pdf';
}

/**
 * Result returned when the user confirms the export.
 */
export interface CrewExportDialogResult {
  /** The crews the user chose to export. */
  selectedCrews: Crew[];
}

/**
 * Crew Export Dialog
 *
 * Lets the user choose which crews to include in a CSV/PDF export.
 * Supports search, select-all/none, and returns the selected crews to the caller.
 */
@Component({
  selector: 'frm-crew-export-dialog',
  templateUrl: './crew-export-dialog.component.html',
  styleUrls: ['./crew-export-dialog.component.scss']
})
export class CrewExportDialogComponent {
  /** Search term for filtering the crew list. */
  searchTerm = '';

  /** Set of selected crew IDs. */
  private selectedIds = new Set<string>();

  constructor(
    private dialogRef: MatDialogRef<CrewExportDialogComponent, CrewExportDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: CrewExportDialogData
  ) {
    // Default to all crews selected so the dialog preserves the previous "export all" behavior.
    this.data.crews.forEach(crew => this.selectedIds.add(crew.id));
  }

  /** Crews matching the current search term. */
  get filteredCrews(): Crew[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.data.crews;
    }
    return this.data.crews.filter(crew =>
      (crew.name || '').toLowerCase().includes(term) ||
      (crew.market || '').toLowerCase().includes(term) ||
      (crew.company || '').toLowerCase().includes(term)
    );
  }

  /** Number of crews currently selected. */
  get selectedCount(): number {
    return this.selectedIds.size;
  }

  /** Whether every crew (across all, not just filtered) is selected. */
  get allSelected(): boolean {
    return this.data.crews.length > 0 && this.selectedIds.size === this.data.crews.length;
  }

  /** Whether some but not all crews are selected (for the indeterminate state). */
  get someSelected(): boolean {
    return this.selectedIds.size > 0 && !this.allSelected;
  }

  isSelected(crew: Crew): boolean {
    return this.selectedIds.has(crew.id);
  }

  toggleCrew(crew: Crew, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(crew.id);
    } else {
      this.selectedIds.delete(crew.id);
    }
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      this.data.crews.forEach(crew => this.selectedIds.add(crew.id));
    } else {
      this.selectedIds.clear();
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    const selectedCrews = this.data.crews.filter(crew => this.selectedIds.has(crew.id));
    this.dialogRef.close({ selectedCrews });
  }
}
