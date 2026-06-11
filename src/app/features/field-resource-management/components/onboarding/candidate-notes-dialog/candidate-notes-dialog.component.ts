import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate } from '../../../models/onboarding.models';

export interface CandidateNotesDialogData {
  candidate: Candidate;
}

@Component({
  selector: 'app-candidate-notes-dialog',
  template: `
    <div class="notes-dialog">
      <div class="notes-dialog-header">
        <h3>Notes — {{ data.candidate.techName }}</h3>
        <button class="close-btn" (click)="onClose()" aria-label="Close">&times;</button>
      </div>

      <div class="notes-dialog-body">
        <div *ngIf="!isEditing" class="notes-display">
          <p *ngIf="currentNotes" class="notes-text">{{ currentNotes }}</p>
          <p *ngIf="!currentNotes" class="notes-empty">No notes yet.</p>
        </div>

        <div *ngIf="isEditing" class="notes-edit">
          <textarea
            class="notes-textarea"
            [(ngModel)]="editedNotes"
            placeholder="Enter notes about this candidate..."
            rows="6"
            [disabled]="isSaving"
          ></textarea>
        </div>

        <div *ngIf="errorMessage" class="error-msg" role="alert">{{ errorMessage }}</div>
      </div>

      <div class="notes-dialog-footer">
        <button *ngIf="!isEditing" class="btn-edit" (click)="startEditing()">
          {{ currentNotes ? 'Edit' : 'Add Note' }}
        </button>
        <button *ngIf="isEditing" class="btn-save" (click)="saveNotes()" [disabled]="isSaving">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
        <button *ngIf="isEditing" class="btn-cancel" (click)="cancelEditing()" [disabled]="isSaving">
          Cancel
        </button>
        <button *ngIf="!isEditing" class="btn-close" (click)="onClose()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .notes-dialog {
      padding: 1.25rem;
      min-width: 380px;
    }

    .notes-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .notes-dialog-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #212121;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #757575;
      line-height: 1;
      padding: 0 0.25rem;
    }

    .close-btn:hover {
      color: #212121;
    }

    .notes-dialog-body {
      margin-bottom: 1rem;
    }

    .notes-text {
      font-size: 0.875rem;
      color: #424242;
      white-space: pre-wrap;
      line-height: 1.5;
      margin: 0;
      padding: 0.75rem;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      max-height: 200px;
      overflow-y: auto;
    }

    .notes-empty {
      font-size: 0.875rem;
      color: #9e9e9e;
      font-style: italic;
      margin: 0;
      padding: 0.75rem;
    }

    .notes-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: inherit;
      resize: vertical;
      line-height: 1.5;
    }

    .notes-textarea:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .error-msg {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: #c62828;
    }

    .notes-dialog-footer {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-edit, .btn-save, .btn-cancel, .btn-close {
      padding: 0.4rem 0.875rem;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .btn-edit {
      background: #e3f2fd;
      color: #1565c0;
      border-color: #90caf9;
    }

    .btn-edit:hover { background: #bbdefb; }

    .btn-save {
      background: #1976d2;
      color: #fff;
    }

    .btn-save:hover { background: #1565c0; }
    .btn-save:disabled { background: #90caf9; cursor: not-allowed; }

    .btn-cancel {
      background: #f5f5f5;
      color: #424242;
      border-color: #e0e0e0;
    }

    .btn-cancel:hover { background: #eeeeee; }

    .btn-close {
      background: #f5f5f5;
      color: #424242;
      border-color: #e0e0e0;
    }

    .btn-close:hover { background: #eeeeee; }
  `]
})
export class CandidateNotesDialogComponent implements OnInit {
  currentNotes = '';
  editedNotes = '';
  isEditing = false;
  isSaving = false;
  errorMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CandidateNotesDialogData,
    private dialogRef: MatDialogRef<CandidateNotesDialogComponent>,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.currentNotes = this.data.candidate.notes || '';
  }

  startEditing(): void {
    this.editedNotes = this.currentNotes;
    this.isEditing = true;
    this.errorMessage = '';
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.errorMessage = '';
  }

  saveNotes(): void {
    this.isSaving = true;
    this.errorMessage = '';

    this.onboardingService
      .updateCandidate(this.data.candidate.candidateId, { notes: this.editedNotes })
      .subscribe({
        next: () => {
          this.currentNotes = this.editedNotes;
          this.data.candidate.notes = this.editedNotes;
          this.isEditing = false;
          this.isSaving = false;
        },
        error: () => {
          this.errorMessage = 'Failed to save notes. Please try again.';
          this.isSaving = false;
        },
      });
  }

  onClose(): void {
    this.dialogRef.close(this.currentNotes !== (this.data.candidate.notes || ''));
  }
}
