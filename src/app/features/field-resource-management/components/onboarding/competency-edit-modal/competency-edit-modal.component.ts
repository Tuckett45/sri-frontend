import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TechnicalCompetency, ProficiencyLevel, PREDEFINED_COMPETENCIES } from '../../../models/competency.model';

export interface CompetencyEditModalData {
  mode: 'add' | 'edit';
  technicianId: string;
  competency?: TechnicalCompetency;
}

@Component({
  selector: 'app-competency-edit-modal',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add Competency' : 'Edit Competency' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="modal-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Competency Name</mat-label>
          <mat-select formControlName="competencySelection" required>
            <mat-option *ngFor="let name of predefinedCompetencies" [value]="name">{{ name }}</mat-option>
            <mat-option value="custom">Custom...</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('competencySelection')?.hasError('required')">Competency name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="form.get('competencySelection')?.value === 'custom'">
          <mat-label>Custom Competency Name</mat-label>
          <input matInput formControlName="customCompetencyName" required />
          <mat-error *ngIf="form.get('customCompetencyName')?.hasError('required')">Custom name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Proficiency Level</mat-label>
          <mat-select formControlName="proficiencyLevel" required>
            <mat-option value="beginner">Beginner</mat-option>
            <mat-option value="intermediate">Intermediate</mat-option>
            <mat-option value="advanced">Advanced</mat-option>
            <mat-option value="expert">Expert</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('proficiencyLevel')?.hasError('required')">Proficiency level is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Verification Date</mat-label>
          <input matInput type="date" formControlName="verificationDate" required />
          <mat-error *ngIf="form.get('verificationDate')?.hasError('required')">Verification date is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Verified By</mat-label>
          <input matInput formControlName="verifiedBy" required />
          <mat-error *ngIf="form.get('verifiedBy')?.hasError('required')">Verified by is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 0 24px;
      min-width: 432px;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 8px 24px 16px;
    }
  `]
})
export class CompetencyEditModalComponent {
  form: FormGroup;
  predefinedCompetencies = PREDEFINED_COMPETENCIES;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CompetencyEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompetencyEditModalData
  ) {
    const comp = data.competency;

    // Determine if existing competency name is predefined or custom
    let competencySelection = '';
    let customCompetencyName = '';
    if (comp) {
      const isPredefined = (PREDEFINED_COMPETENCIES as readonly string[]).includes(comp.competencyName);
      competencySelection = isPredefined ? comp.competencyName : 'custom';
      customCompetencyName = isPredefined ? '' : comp.competencyName;
    }

    this.form = this.fb.group({
      competencySelection: [competencySelection, Validators.required],
      customCompetencyName: [customCompetencyName],
      proficiencyLevel: [comp?.proficiencyLevel || '', Validators.required],
      verificationDate: [comp?.verificationDate || '', Validators.required],
      verifiedBy: [comp?.verifiedBy || '', Validators.required],
      notes: [comp?.notes || '']
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const competencyName = value.competencySelection === 'custom'
      ? value.customCompetencyName.trim()
      : value.competencySelection;

    if (!competencyName) {
      return;
    }

    const result = {
      competencyName,
      proficiencyLevel: value.proficiencyLevel as ProficiencyLevel,
      verificationDate: value.verificationDate,
      verifiedBy: value.verifiedBy.trim(),
      notes: value.notes?.trim() || undefined
    };

    this.dialogRef.close(result);
  }
}
