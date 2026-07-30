import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Skill, SkillLevel } from '../../../../models/technician.model';

export interface AddSkillDialogData {
  technicianId: string;
  existingSkill?: Skill; // If provided, we're editing
}

@Component({
  selector: 'app-add-skill-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.existingSkill ? 'Edit Skill' : 'Add Skill' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="skill-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Skill Name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Skill name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <input matInput formControlName="category" />
          <mat-error *ngIf="form.get('category')?.hasError('required')">Category is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Level</mat-label>
          <mat-select formControlName="level">
            <mat-option *ngFor="let level of skillLevels" [value]="level.value">
              {{ level.label }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('level')?.hasError('required')">Level is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ data.existingSkill ? 'Update' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .skill-form { display: flex; flex-direction: column; min-width: 350px; gap: 0.25rem; }
    .full-width { width: 100%; }
  `]
})
export class AddSkillDialogComponent {
  form: FormGroup;

  skillLevels = [
    { value: SkillLevel.Beginner, label: 'Beginner' },
    { value: SkillLevel.Intermediate, label: 'Intermediate' },
    { value: SkillLevel.Advanced, label: 'Advanced' },
    { value: SkillLevel.Expert, label: 'Expert' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddSkillDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddSkillDialogData
  ) {
    this.form = this.fb.group({
      name: [data.existingSkill?.name || '', Validators.required],
      category: [data.existingSkill?.category || '', Validators.required],
      level: [data.existingSkill?.level || SkillLevel.Beginner, Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const skill: Skill = {
      id: this.data.existingSkill?.id || '',
      technicianId: this.data.technicianId,
      ...this.form.value
    };

    this.dialogRef.close(skill);
  }
}
