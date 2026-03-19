/**
 * Unit tests for ApprovalDecisionComponent
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { ApprovalDecisionComponent } from './approval-decision.component';
import { ApprovalDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';
import * as ApprovalActions from '../../state/approvals/approval.actions';
import * as ApprovalSelectors from '../../state/approvals/approval.selectors';

describe('ApprovalDecisionComponent', () => {
  let component: ApprovalDecisionComponent;
  let fixture: ComponentFixture<ApprovalDecisionComponent>;
  let store: MockStore;

  const mockApproval: ApprovalDto = {
    id: 'approval-1',
    forState: LifecycleState.READY,
    status: ApprovalStatus.PENDING,
    approverId: undefined,
    approvedAt: undefined,
    comments: undefined
  };

  const initialState = {
    atlas: {
      approvals: {
        loading: {
          recordingDecision: false
        },
        error: {
          recordingDecision: null
        }
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDecisionComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    
    // Setup selectors
    store.overrideSelector(ApprovalSelectors.selectRecordingDecision, false);
    store.overrideSelector(ApprovalSelectors.selectApprovalRecordingDecisionError, null);

    fixture = TestBed.createComponent(ApprovalDecisionComponent);
    component = fixture.componentInstance;
    component.approval = mockApproval;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    fixture.detectChanges();
    
    expect(component.decisionForm).toBeDefined();
    expect(component.decisionForm.get('decision')?.value).toBe('APPROVED');
    expect(component.decisionForm.get('comments')?.value).toBe('');
  });

  it('should require comments when decision is DENIED', () => {
    fixture.detectChanges();
    
    const commentsControl = component.decisionForm.get('comments');
    
    // Initially, comments are not required for APPROVED
    expect(commentsControl?.hasError('required')).toBe(false);
    
    // Change decision to DENIED
    component.decisionForm.patchValue({ decision: 'DENIED' });
    
    // Now comments should be required
    expect(commentsControl?.hasError('required')).toBe(true);
    
    // Add comments
    commentsControl?.setValue('Reason for denial');
    expect(commentsControl?.hasError('required')).toBe(false);
  });

  it('should dispatch recordDecision action on submit', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    component.decisionForm.patchValue({
      decision: 'APPROVED',
      comments: 'Looks good',
      approverRole: 'TECHNICAL_LEAD',
      approverAuthority: 'LEVEL_2'
    });
    
    component.onSubmit();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      ApprovalActions.recordDecision({
        approvalId: 'approval-1',
        decision: {
          decision: 'APPROVED',
          comments: 'Looks good',
          approverRole: 'TECHNICAL_LEAD',
          approverAuthority: 'LEVEL_2',
          conditions: undefined
        }
      })
    );
  });

  it('should emit decisionSubmitted event on submit', () => {
    spyOn(component.decisionSubmitted, 'emit');
    fixture.detectChanges();
    
    component.decisionForm.patchValue({
      decision: 'APPROVED',
      comments: 'Approved'
    });
    
    component.onSubmit();
    
    expect(component.decisionSubmitted.emit).toHaveBeenCalled();
  });

  it('should not submit if form is invalid', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    // Set decision to DENIED without comments (invalid)
    component.decisionForm.patchValue({
      decision: 'DENIED',
      comments: ''
    });
    
    component.onSubmit();
    
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('should include conditions in decision when provided', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    component.decisionForm.patchValue({
      decision: 'APPROVED',
      comments: 'Approved with conditions',
      conditions: {
        requiresFollowUp: true,
        followUpDate: '2024-02-01',
        additionalReview: true,
        customCondition: 'Must complete security review'
      }
    });
    
    component.onSubmit();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      ApprovalActions.recordDecision({
        approvalId: 'approval-1',
        decision: {
          decision: 'APPROVED',
          comments: 'Approved with conditions',
          approverRole: undefined,
          approverAuthority: undefined,
          conditions: {
            requiresFollowUp: true,
            followUpDate: '2024-02-01',
            additionalReview: true,
            customCondition: 'Must complete security review'
          }
        }
      })
    );
  });

  it('should reset form on cancel', () => {
    spyOn(component.cancelled, 'emit');
    fixture.detectChanges();
    
    component.decisionForm.patchValue({
      decision: 'DENIED',
      comments: 'Test comments'
    });
    
    component.onCancel();
    
    expect(component.decisionForm.get('decision')?.value).toBe('APPROVED');
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('should validate form submission requirements', () => {
    fixture.detectChanges();
    
    // Invalid form
    component.decisionForm.patchValue({ decision: 'DENIED', comments: '' });
    expect(component.canSubmit()).toBe(false);
    
    // Valid form
    component.decisionForm.patchValue({ decision: 'DENIED', comments: 'Reason' });
    expect(component.canSubmit()).toBe(true);
    
    // Recording in progress
    component.recordingDecision = true;
    expect(component.canSubmit()).toBe(false);
    
    // No approval
    component.recordingDecision = false;
    component.approval = null;
    expect(component.canSubmit()).toBe(false);
  });

  it('should format state labels correctly', () => {
    expect(component.formatStateLabel(LifecycleState.IN_PROGRESS)).toBe('IN PROGRESS');
    expect(component.formatStateLabel(LifecycleState.QA_REVIEW)).toBe('QA REVIEW');
  });

  it('should get correct severity for states', () => {
    expect(component.getStateSeverity(LifecycleState.READY)).toBe('success');
    expect(component.getStateSeverity(LifecycleState.CANCELLED)).toBe('danger');
    expect(component.getStateSeverity(LifecycleState.IN_PROGRESS)).toBe('warning');
  });

  it('should detect form field errors', () => {
    fixture.detectChanges();
    
    const commentsControl = component.decisionForm.get('comments');
    
    // Set decision to DENIED to make comments required
    component.decisionForm.patchValue({ decision: 'DENIED' });
    
    // Mark as touched and dirty
    commentsControl?.markAsTouched();
    commentsControl?.markAsDirty();
    
    expect(component.hasError('comments', 'required')).toBe(true);
    
    // Add value
    commentsControl?.setValue('Test');
    expect(component.hasError('comments', 'required')).toBe(false);
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
