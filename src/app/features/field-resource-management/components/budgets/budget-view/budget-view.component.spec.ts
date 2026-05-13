import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';

import { BudgetViewComponent } from './budget-view.component';
import { BudgetAdjustmentDialogComponent } from '../budget-adjustment-dialog/budget-adjustment-dialog.component';
import { JobBudget, BudgetAdjustment, BudgetDeduction, BudgetStatus } from '../../../models/budget.model';
import * as BudgetActions from '../../../state/budgets/budget.actions';
import {
  selectBudgetViewModel,
  selectBudgetConsumptionPercentage,
  selectBudgetStatus
} from '../../../state/budgets/budget.selectors';
import { PermissionService } from '../../../../../services/permission.service';

describe('BudgetViewComponent', () => {
  let component: BudgetViewComponent;
  let fixture: ComponentFixture<BudgetViewComponent>;
  let store: MockStore;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const mockBudget: JobBudget = {
    id: 'budget-1',
    jobId: 'job-1',
    allocatedHours: 100,
    consumedHours: 45,
    remainingHours: 55,
    status: BudgetStatus.OnTrack,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  };

  const mockAdjustments: BudgetAdjustment[] = [
    {
      id: 'adj-1',
      jobId: 'job-1',
      amount: 20,
      reason: 'Scope increase for additional work',
      adjustedBy: 'user-1',
      adjustedByName: 'Admin User',
      timestamp: new Date('2024-01-10'),
      previousBudget: 80,
      newBudget: 100
    }
  ];

  const mockDeductions: BudgetDeduction[] = [
    {
      id: 'ded-1',
      jobId: 'job-1',
      timecardEntryId: 'tc-1',
      technicianId: 'tech-1',
      technicianName: 'John Doe',
      hoursDeducted: 8,
      timestamp: new Date('2024-01-12')
    }
  ];

  const mockUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@test.com',
    password: '',
    role: 'Admin',
    market: 'ALL',
    company: 'INTERNAL',
    createdDate: new Date(),
    isApproved: true
  };

  const mockViewModel = {
    budget: mockBudget,
    adjustments: mockAdjustments,
    deductions: mockDeductions,
    loading: false,
    error: null,
    consumptionPercentage: 45,
    hasAdjustments: true,
    hasDeductions: true
  };

  beforeEach(async () => {
    const permissionSpy = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'checkPermission'
    ]);
    permissionSpy.getCurrentUser.and.returnValue(of(mockUser));
    permissionSpy.checkPermission.and.returnValue(true);

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [BudgetViewComponent],
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatCardModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatTabsModule,
        MatListModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        provideMockStore({}),
        { provide: PermissionService, useValue: permissionSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    store.overrideSelector(selectBudgetViewModel('job-1'), mockViewModel);
    store.overrideSelector(selectBudgetConsumptionPercentage('job-1'), 45);
    store.overrideSelector(selectBudgetStatus('job-1'), BudgetStatus.OnTrack);

    fixture = TestBed.createComponent(BudgetViewComponent);
    component = fixture.componentInstance;
    component.jobId = 'job-1';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should dispatch load actions on init', () => {
      spyOn(store, 'dispatch');
      component.ngOnInit();

      expect(store.dispatch).toHaveBeenCalledWith(BudgetActions.loadBudget({ jobId: 'job-1' }));
      expect(store.dispatch).toHaveBeenCalledWith(BudgetActions.loadAdjustmentHistory({ jobId: 'job-1' }));
      expect(store.dispatch).toHaveBeenCalledWith(BudgetActions.loadDeductionHistory({ jobId: 'job-1' }));
    });

    it('should check user permissions on init', () => {
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(component.canAdjustBudget).toBeTrue();
    });

    it('should set canAdjustBudget to false for unauthorized users', () => {
      permissionService.checkPermission.and.returnValue(false);
      component.ngOnInit();
      expect(component.canAdjustBudget).toBeFalse();
    });
  });

  describe('Budget Status Display', () => {
    it('should return correct color class for on-track status', () => {
      expect(component.getStatusColor(BudgetStatus.OnTrack)).toBe('on-track');
    });

    it('should return correct color class for warning status', () => {
      expect(component.getStatusColor(BudgetStatus.Warning)).toBe('warning');
    });

    it('should return correct color class for over-budget status', () => {
      expect(component.getStatusColor(BudgetStatus.OverBudget)).toBe('over-budget');
    });

    it('should return default color for null status', () => {
      expect(component.getStatusColor(null)).toBe('on-track');
    });

    it('should return correct label for each status', () => {
      expect(component.getStatusLabel(BudgetStatus.OnTrack)).toBe('On Track');
      expect(component.getStatusLabel(BudgetStatus.Warning)).toBe('Warning');
      expect(component.getStatusLabel(BudgetStatus.OverBudget)).toBe('Over Budget');
      expect(component.getStatusLabel(null)).toBe('Unknown');
    });

    it('should return correct progress bar color', () => {
      expect(component.getProgressBarColor(BudgetStatus.OnTrack)).toBe('primary');
      expect(component.getProgressBarColor(BudgetStatus.Warning)).toBe('accent');
      expect(component.getProgressBarColor(BudgetStatus.OverBudget)).toBe('warn');
      expect(component.getProgressBarColor(null)).toBe('primary');
    });
  });

  describe('Adjustment Dialog', () => {
    it('should open adjustment dialog with current budget data', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRefSpy);

      component.openAdjustmentDialog(mockBudget);

      expect(dialog.open).toHaveBeenCalledWith(BudgetAdjustmentDialogComponent, {
        width: '500px',
        data: {
          currentBudget: 100,
          consumedHours: 45,
          remainingHours: 55
        }
      });
    });

    it('should dispatch adjustBudget action when dialog returns result', () => {
      spyOn(store, 'dispatch');
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of({ amount: 10, reason: 'Additional scope' }));
      dialog.open.and.returnValue(dialogRefSpy);

      component.openAdjustmentDialog(mockBudget);

      expect(store.dispatch).toHaveBeenCalledWith(BudgetActions.adjustBudget({
        jobId: 'job-1',
        adjustment: { amount: 10, reason: 'Additional scope' }
      }));
    });

    it('should not dispatch when dialog is cancelled', () => {
      spyOn(store, 'dispatch');
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRefSpy);

      component.openAdjustmentDialog(mockBudget);

      expect(store.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: BudgetActions.adjustBudget.type })
      );
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const formatted = component.formatDate(new Date('2024-01-15T10:30:00'));
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy subject on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
