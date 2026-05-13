import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import {
  BudgetAdjustmentDialogComponent,
  BudgetAdjustmentDialogData
} from './budget-adjustment-dialog.component';

describe('BudgetAdjustmentDialogComponent', () => {
  let component: BudgetAdjustmentDialogComponent;
  let fixture: ComponentFixture<BudgetAdjustmentDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BudgetAdjustmentDialogComponent>>;

  const mockData: BudgetAdjustmentDialogData = {
    currentBudget: 100,
    consumedHours: 45,
    remainingHours: 55
  };

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [BudgetAdjustmentDialogComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDividerModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<BudgetAdjustmentDialogComponent>>;
    fixture = TestBed.createComponent(BudgetAdjustmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.adjustmentForm.get('amount')?.value).toBe(0);
      expect(component.adjustmentForm.get('reason')?.value).toBe('');
    });

    it('should receive dialog data', () => {
      expect(component.data.currentBudget).toBe(100);
      expect(component.data.consumedHours).toBe(45);
      expect(component.data.remainingHours).toBe(55);
    });
  });

  describe('Form Validation', () => {
    it('should require amount', () => {
      component.adjustmentForm.get('amount')?.setValue(null);
      expect(component.adjustmentForm.get('amount')?.hasError('required')).toBeTrue();
    });

    it('should enforce minimum amount of -1000', () => {
      component.adjustmentForm.get('amount')?.setValue(-1001);
      expect(component.adjustmentForm.get('amount')?.hasError('min')).toBeTrue();
    });

    it('should enforce maximum amount of 1000', () => {
      component.adjustmentForm.get('amount')?.setValue(1001);
      expect(component.adjustmentForm.get('amount')?.hasError('max')).toBeTrue();
    });

    it('should accept valid amount within range', () => {
      component.adjustmentForm.get('amount')?.setValue(50);
      expect(component.adjustmentForm.get('amount')?.valid).toBeTrue();
    });

    it('should accept negative amount within range', () => {
      component.adjustmentForm.get('amount')?.setValue(-50);
      expect(component.adjustmentForm.get('amount')?.valid).toBeTrue();
    });

    it('should require reason', () => {
      component.adjustmentForm.get('reason')?.setValue('');
      component.adjustmentForm.get('reason')?.markAsTouched();
      expect(component.adjustmentForm.get('reason')?.hasError('required')).toBeTrue();
    });

    it('should enforce minimum reason length of 10', () => {
      component.adjustmentForm.get('reason')?.setValue('short');
      expect(component.adjustmentForm.get('reason')?.hasError('minlength')).toBeTrue();
    });

    it('should accept valid reason', () => {
      component.adjustmentForm.get('reason')?.setValue('This is a valid reason for adjustment');
      expect(component.adjustmentForm.get('reason')?.valid).toBeTrue();
    });

    it('should be invalid when form is incomplete', () => {
      component.adjustmentForm.get('amount')?.setValue(0);
      component.adjustmentForm.get('reason')?.setValue('');
      expect(component.adjustmentForm.valid).toBeFalse();
    });

    it('should be valid when all fields are properly filled', () => {
      component.adjustmentForm.get('amount')?.setValue(10);
      component.adjustmentForm.get('reason')?.setValue('Scope increase for additional work');
      expect(component.adjustmentForm.valid).toBeTrue();
    });
  });

  describe('Budget Preview', () => {
    it('should calculate new budget correctly for positive adjustment', () => {
      component.adjustmentForm.get('amount')?.setValue(20);
      expect(component.newBudget).toBe(120);
    });

    it('should calculate new budget correctly for negative adjustment', () => {
      component.adjustmentForm.get('amount')?.setValue(-30);
      expect(component.newBudget).toBe(70);
    });

    it('should calculate new remaining correctly', () => {
      component.adjustmentForm.get('amount')?.setValue(20);
      expect(component.newRemaining).toBe(75);
    });

    it('should handle zero adjustment', () => {
      component.adjustmentForm.get('amount')?.setValue(0);
      expect(component.newBudget).toBe(100);
      expect(component.newRemaining).toBe(55);
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog with form value on submit', () => {
      component.adjustmentForm.get('amount')?.setValue(15);
      component.adjustmentForm.get('reason')?.setValue('Budget increase for extra scope');

      component.submit();

      expect(dialogRef.close).toHaveBeenCalledWith({
        amount: 15,
        reason: 'Budget increase for extra scope'
      });
    });

    it('should not close dialog on submit when form is invalid', () => {
      component.adjustmentForm.get('amount')?.setValue(null);
      component.adjustmentForm.get('reason')?.setValue('');

      component.submit();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close dialog with null on cancel', () => {
      component.cancel();
      expect(dialogRef.close).toHaveBeenCalledWith(null);
    });
  });
});
