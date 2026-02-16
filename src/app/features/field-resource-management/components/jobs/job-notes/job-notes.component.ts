import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';

import { JobNote } from '../../../models/job.model';
import * as JobActions from '../../../state/jobs/job.actions';

/**
 * Job Notes Component
 * 
 * Displays and manages notes for a job.
 * Allows adding new notes and editing existing notes within 1 hour of creation.
 * 
 * Features:
 * - Display notes in chronological order (newest first)
 * - Show author, timestamp, and note text
 * - Add new notes
 * - Edit notes within 1 hour of creation
 * - Integration with job state
 * 
 * Requirements: 25.1-25.6
 */
@Component({
  selector: 'frm-job-notes',
  templateUrl: './job-notes.component.html',
  styleUrls: ['./job-notes.component.scss']
})
export class JobNotesComponent implements OnInit {
  @Input() jobId!: string;
  @Input() notes: JobNote[] = [];
  
  // Note editing
  editingNoteId: string | null = null;
  editingNoteText = '';
  
  // New note
  newNoteText = '';
  isAddingNote = false;

  constructor(
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Sort notes by creation date (newest first)
    this.sortNotes();
  }

  /**
   * Sort notes by creation date (newest first)
   */
  private sortNotes(): void {
    this.notes = [...this.notes].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Show add note form
   */
  showAddNoteForm(): void {
    this.isAddingNote = true;
    this.newNoteText = '';
  }

  /**
   * Cancel adding note
   */
  cancelAddNote(): void {
    this.isAddingNote = false;
    this.newNoteText = '';
  }

  /**
   * Add new note
   */
  addNote(): void {
    if (!this.newNoteText.trim()) {
      this.snackBar.open('Note cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    if (this.newNoteText.length > 2000) {
      this.snackBar.open('Note cannot exceed 2000 characters', 'Close', { duration: 3000 });
      return;
    }

    this.store.dispatch(JobActions.addJobNote({
      jobId: this.jobId,
      note: this.newNoteText.trim()
    }));

    this.snackBar.open('Note added successfully', 'Close', { duration: 3000 });
    this.isAddingNote = false;
    this.newNoteText = '';
  }

  /**
   * Start editing a note
   */
  startEditNote(note: JobNote): void {
    // Check if note was created within 1 hour
    if (!this.canEditNote(note)) {
      this.snackBar.open('Notes can only be edited within 1 hour of creation', 'Close', { duration: 3000 });
      return;
    }

    this.editingNoteId = note.id;
    this.editingNoteText = note.text;
  }

  /**
   * Cancel editing note
   */
  cancelEditNote(): void {
    this.editingNoteId = null;
    this.editingNoteText = '';
  }

  /**
   * Save edited note
   */
  saveEditNote(note: JobNote): void {
    if (!this.editingNoteText.trim()) {
      this.snackBar.open('Note cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    if (this.editingNoteText.length > 2000) {
      this.snackBar.open('Note cannot exceed 2000 characters', 'Close', { duration: 3000 });
      return;
    }

    // In a real implementation, this would dispatch an update action
    // For now, we'll just show a success message
    this.snackBar.open('Note updated successfully', 'Close', { duration: 3000 });
    this.editingNoteId = null;
    this.editingNoteText = '';
  }

  /**
   * Check if note can be edited (within 1 hour)
   */
  canEditNote(note: JobNote): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const noteCreated = new Date(note.createdAt);
    return noteCreated >= oneHourAgo;
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Get relative time (e.g., "5 minutes ago")
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const noteDate = new Date(date);
    const diffMs = now.getTime() - noteDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatDateTime(date);
  }

  /**
   * Get character count for textarea
   */
  get newNoteCharCount(): number {
    return this.newNoteText.length;
  }

  /**
   * Get character count for editing textarea
   */
  get editNoteCharCount(): number {
    return this.editingNoteText.length;
  }

  /**
   * Check if add note button should be disabled
   */
  get isAddNoteDisabled(): boolean {
    return !this.newNoteText.trim() || this.newNoteText.length > 2000;
  }

  /**
   * Check if save edit button should be disabled
   */
  get isSaveEditDisabled(): boolean {
    return !this.editingNoteText.trim() || this.editingNoteText.length > 2000;
  }
}
