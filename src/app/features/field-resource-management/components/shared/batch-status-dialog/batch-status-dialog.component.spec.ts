import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BatchStatusDialogComponent } from './batch-status-dialog.component';
import { JobStatus } from '../../../models/job.model';

describe('BatchStatusDialogComponent', () => {
  let component: BatchStatusDialogComponent;
  let fixture: ComponentFixture<BatchStatusDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BatchStatusDialogComponent>>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [BatchStatusDialogComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { selectedCount: 5 } }
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<BatchStatusDialogComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchStatusDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with null status', () => {
    expect(component.form.get('status')?.value).toBeNull();
    expect(component.form.get('reason')?.value).toBe('');
  });

  it('should require status field', () => {
    const statusControl = component.form.get('status');
    expect(statusControl?.hasError('required')).toBe(true);
    
    statusControl?.setValue(JobStatus.Completed);
    expect(statusControl?.hasError('required')).toBe(false);
  });

  it('should require reason when status is Issue', () => {
    const statusControl = component.form.get('status');
    const reasonControl = component.form.get('reason');

    statusControl?.setValue(JobStatus.Issue);
    expect(reasonControl?.hasError('required')).toBe(true);

    reasonControl?.setValue('Test reason');
    expect(reasonControl?.hasError('required')).toBe(false);
  });

  it('should not require reason for other statuses', () => {
    const statusControl = component.form.get('status');
    const reasonControl = component.form.get('reason');

    statusControl?.setValue(JobStatus.Completed);
    expect(reasonControl?.hasError('required')).toBe(false);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with result on confirm when form is valid', () => {
    component.form.patchValue({
      status: JobStatus.Completed,
      reason: ''
    });

    component.onConfirm();
    expect(dialogRef.close).toHaveBeenCalledWith({
      status: JobStatus.Completed,
      reason: undefined
    });
  });

  it('should not close dialog on confirm when form is invalid', () => {
    component.form.patchValue({
      status: null,
      reason: ''
    });

    component.onConfirm();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should return true for requiresReason when status is Issue', () => {
    component.form.patchValue({ status: JobStatus.Issue });
    expect(component.requiresReason).toBe(true);
  });

  it('should return false for requiresReason when status is not Issue', () => {
    component.form.patchValue({ status: JobStatus.Completed });
    expect(component.requiresReason).toBe(false);
  });
});
