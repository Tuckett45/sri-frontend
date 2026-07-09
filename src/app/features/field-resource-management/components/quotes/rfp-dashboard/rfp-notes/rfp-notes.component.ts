import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RfpNote } from '../../../../models/quote-workflow.model';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

/**
 * RFP Notes Component
 *
 * Provides the ability to view, add, edit, pin, and delete notes
 * on an RFP record. Notes are displayed in chronological order with
 * pinned notes shown first.
 */
@Component({
  selector: 'app-rfp-notes',
  templateUrl: './rfp-notes.component.html',
  styleUrls: ['./rfp-notes.component.scss']
})
export class RfpNotesComponent implements OnInit, OnChanges {
  @Input() quoteId!: string;
  @Input() notes: RfpNote[] = [];

  sortedNotes: RfpNote[] = [];
  newNoteContent = '';
  isAddingNote = false;
  editingNoteId: string | null = null;
  editNoteContent = '';
  isExpanded = true;

  constructor(
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sortNotes();
    // Load notes for this quote
    if (this.quoteId) {
      this.store.dispatch(DashboardActions.loadNotes({ quoteId: this.quoteId }));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notes']) {
      this.sortNotes();
    }
  }

  private sortNotes(): void {
    // Pinned notes first, then by date descending (newest first)
    this.sortedNotes = [...(this.notes || [])].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  // ─── Add Note ─────────────────────────────────────────────────────────────

  startAddNote(): void {
    this.isAddingNote = true;
    this.newNoteContent = '';
  }

  cancelAddNote(): void {
    this.isAddingNote = false;
    this.newNoteContent = '';
  }

  submitNote(): void {
    const content = this.newNoteContent.trim();
    if (!content) {
      this.snackBar.open('Note content cannot be empty', 'Close', { duration: 2000 });
      return;
    }

    this.store.dispatch(DashboardActions.addNote({
      quoteId: this.quoteId,
      content
    }));

    this.isAddingNote = false;
    this.newNoteContent = '';
    this.snackBar.open('Note added', 'Close', { duration: 2000 });
  }

  // ─── Edit Note ────────────────────────────────────────────────────────────

  startEditNote(note: RfpNote): void {
    this.editingNoteId = note.id;
    this.editNoteContent = note.content;
  }

  cancelEditNote(): void {
    this.editingNoteId = null;
    this.editNoteContent = '';
  }

  saveEditNote(note: RfpNote): void {
    const content = this.editNoteContent.trim();
    if (!content) {
      this.snackBar.open('Note content cannot be empty', 'Close', { duration: 2000 });
      return;
    }

    if (content !== note.content) {
      this.store.dispatch(DashboardActions.updateNote({
        quoteId: this.quoteId,
        noteId: note.id,
        content
      }));
      this.snackBar.open('Note updated', 'Close', { duration: 2000 });
    }

    this.editingNoteId = null;
    this.editNoteContent = '';
  }

  // ─── Pin/Unpin Note ───────────────────────────────────────────────────────

  togglePin(note: RfpNote): void {
    this.store.dispatch(DashboardActions.toggleNotePin({
      quoteId: this.quoteId,
      noteId: note.id,
      isPinned: !note.isPinned
    }));
  }

  // ─── Delete Note ──────────────────────────────────────────────────────────

  deleteNote(note: RfpNote): void {
    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (confirmed) {
      this.store.dispatch(DashboardActions.deleteNote({
        quoteId: this.quoteId,
        noteId: note.id
      }));
      this.snackBar.open('Note deleted', 'Close', { duration: 2000 });
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
