/**
 * Unit tests for ApprovalListComponent
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ApprovalListComponent } from './approval-list.component';
import { ApprovalDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';
import * as ApprovalActions from '../../state/approvals/approval.actions';
import * as ApprovalSelectors from '../../state/approvals/approval.selectors';

describe('ApprovalListComponent', () => {
  let component: ApprovalListComponent;
  let fixture: ComponentFixture<ApprovalListComponent>;
  let store: MockStore;
  let router: Router;

  const mockApprovals: ApprovalDto[] = [
    {
      id: 'approval-1',
      forState: LifecycleState.READY,
      status: ApprovalStatus.PENDING,
      approverId: undefined,
      approvedAt: undefined,
      comments: undefined
    },
    {
      id: 'approval-2',
      forState: LifecycleState.IN_PROGRESS,
      status: ApprovalStatus.APPROVED,
      approverId: 'user-123',
      approvedAt: new Date('2024-01-15T10:00:00Z'),
      comments: 'Approved for deployment'
    }
  ];

  const initialState = {
    atlas: {
      approvals: {
        ids: ['approval-1', 'approval-2'],
        entities: {
          'approval-1': mockApprovals[0],
          'approval-2': mockApprovals[1]
        },
        selectedId: null,
        loading: {
          list: false,
          detail: false,
          requesting: false,
          recordingDecision: false,
          checkingAuthority: false,
          loadingPending: false,
          loadingUserApprovals: false
        },
        error: {
          list: null,
          detail: null,
          requesting: null,
          recordingDecision: null,
          checkingAuthority: null,
          loadingPending: null,
          loadingUserApprovals: null
        },
        pagination: null,
        filters: {},
        pendingApprovals: [mockApprovals[0]],
        userApprovals: {
          items: [],
          pagination: null
        },
        authority: null,
        lastLoaded: null
      }
    }
  };

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ApprovalListComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    
    // Setup selectors
    store.overrideSelector(ApprovalSelectors.selectPendingApprovals, [mockApprovals[0]]);
    store.overrideSelector(ApprovalSelectors.selectPendingApprovalsLoading, false);
    store.overrideSelector(ApprovalSelectors.selectPendingApprovalsError, null);
    store.overrideSelector(ApprovalSelectors.selectRecordingDecision, false);

    fixture = TestBed.createComponent(ApprovalListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load pending approvals on init', () => {
    spyOn(store, 'dispatch');
    
    fixture.detectChanges();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      ApprovalActions.loadUserApprovals({ page: 1, pageSize: 50 })
    );
  });

  it('should display pending approvals', () => {
    fixture.detectChanges();
    
    expect(component.pendingApprovals).toEqual([mockApprovals[0]]);
  });

  it('should open approve dialog when approve button clicked', () => {
    component.onApprove(mockApprovals[0]);
    
    expect(component.showDecisionDialog).toBe(true);
    expect(component.selectedApproval).toEqual(mockApprovals[0]);
    expect(component.decisionType).toBe('APPROVED');
  });

  it('should open deny dialog when deny button clicked', () => {
    component.onDeny(mockApprovals[0]);
    
    expect(component.showDecisionDialog).toBe(true);
    expect(component.selectedApproval).toEqual(mockApprovals[0]);
    expect(component.decisionType).toBe('DENIED');
  });

  it('should dispatch recordDecision action when submitting decision', () => {
    spyOn(store, 'dispatch');
    
    component.selectedApproval = mockApprovals[0];
    component.decisionType = 'APPROVED';
    component.decisionComments = 'Looks good';
    
    component.onSubmitDecision();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      ApprovalActions.recordDecision({
        approvalId: 'approval-1',
        decision: {
          decision: 'APPROVED',
          comments: 'Looks good'
        }
      })
    );
  });

  it('should close dialog after decision is recorded', () => {
    component.showDecisionDialog = true;
    component.selectedApproval = mockApprovals[0];
    component.decisionType = 'APPROVED';
    
    // Simulate recording decision completion
    store.overrideSelector(ApprovalSelectors.selectRecordingDecision, false);
    store.refreshState();
    fixture.detectChanges();
    
    expect(component.showDecisionDialog).toBe(false);
    expect(component.selectedApproval).toBeNull();
  });

  it('should format state labels correctly', () => {
    expect(component.formatStateLabel(LifecycleState.IN_PROGRESS)).toBe('IN PROGRESS');
    expect(component.formatStateLabel(LifecycleState.QA_REVIEW)).toBe('QA REVIEW');
  });

  it('should format status labels correctly', () => {
    expect(component.formatStatusLabel(ApprovalStatus.PENDING)).toBe('Pending');
    expect(component.formatStatusLabel(ApprovalStatus.APPROVED)).toBe('Approved');
  });

  it('should get correct severity for status', () => {
    expect(component.getStatusSeverity(ApprovalStatus.PENDING)).toBe('warning');
    expect(component.getStatusSeverity(ApprovalStatus.APPROVED)).toBe('success');
    expect(component.getStatusSeverity(ApprovalStatus.DENIED)).toBe('danger');
  });

  it('should validate decision submission requirements', () => {
    component.selectedApproval = null;
    component.decisionType = null;
    expect(component.canSubmitDecision()).toBe(false);
    
    component.selectedApproval = mockApprovals[0];
    component.decisionType = 'APPROVED';
    component.recordingDecision = false;
    expect(component.canSubmitDecision()).toBe(true);
    
    component.recordingDecision = true;
    expect(component.canSubmitDecision()).toBe(false);
  });

  it('should handle retry on error', () => {
    spyOn(store, 'dispatch');
    
    component.onRetry();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      ApprovalActions.loadUserApprovals({ page: 1, pageSize: 50 })
    );
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
