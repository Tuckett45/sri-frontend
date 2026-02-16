/**
 * Exception Request Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ExceptionRequestComponent } from './exception-request.component';
import { CreateExceptionRequest } from '../../models/exception.model';
import * as ExceptionSelectors from '../../state/exceptions/exception.selectors';
import * as ExceptionActions from '../../state/exceptions/exception.actions';

describe('ExceptionRequestComponent', () => {
  let component: ExceptionRequestComponent;
  let fixture: ComponentFixture<ExceptionRequestComponent>;
  let store: MockStore;

  const initialState = {
    atlas: {
      exceptions: {
        loading: {
          creating: false
        },
        error: {
          creating: null
        }
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExceptionRequestComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(ExceptionRequestComponent);
    component = fixture.componentInstance;

    // Setup selectors
    store.overrideSelector(ExceptionSelectors.selectCreatingException, false);
    store.overrideSelector(ExceptionSelectors.selectCreatingError, null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.exceptionForm.value).toEqual({
      exceptionType: '',
      justification: '',
      expiresAt: null,
      supportingEvidence: ''
    });
  });

  it('should mark form as invalid when required fields are empty', () => {
    expect(component.exceptionForm.valid).toBe(false);
  });

  it('should mark form as valid when required fields are filled', () => {
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters'
    });
    expect(component.exceptionForm.valid).toBe(true);
  });

  it('should require justification to be at least 20 characters', () => {
    const justificationControl = component.exceptionForm.get('justification');
    justificationControl?.setValue('Short text');
    expect(justificationControl?.hasError('minlength')).toBe(true);
    
    justificationControl?.setValue('This is a longer justification text');
    expect(justificationControl?.hasError('minlength')).toBe(false);
  });

  it('should dispatch createException action on valid form submission', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters',
      expiresAt: new Date('2024-12-31'),
      supportingEvidence: 'doc1, doc2, doc3'
    });

    component.onSubmit();

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(ExceptionActions.createException.type);
    expect(dispatchedAction.request.exceptionType).toBe('COMPLIANCE_WAIVER');
    expect(dispatchedAction.request.justification).toBe('This is a valid justification with more than 20 characters');
    expect(dispatchedAction.request.requestedBy).toBe('current-user');
    expect(dispatchedAction.request.supportingEvidence).toEqual(['doc1', 'doc2', 'doc3']);
  });

  it('should not dispatch action when form is invalid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.onSubmit();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should not dispatch action when deploymentId is missing', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters'
    });
    component.onSubmit();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should emit close event when dialog is closed', () => {
    const closeSpy = spyOn(component.close, 'emit');
    component.onClose();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should reset form when dialog is closed', () => {
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'Test justification'
    });
    component.onClose();
    expect(component.exceptionForm.value.exceptionType).toBe(null);
    expect(component.exceptionForm.value.justification).toBe(null);
  });

  it('should check if field has error', () => {
    const justificationControl = component.exceptionForm.get('justification');
    justificationControl?.markAsTouched();
    justificationControl?.setValue('');
    expect(component.hasError('justification', 'required')).toBe(true);
  });

  it('should return correct error message for required field', () => {
    const justificationControl = component.exceptionForm.get('justification');
    justificationControl?.markAsTouched();
    justificationControl?.setValue('');
    expect(component.getErrorMessage('justification')).toBe('Justification is required');
  });

  it('should return correct error message for minlength', () => {
    const justificationControl = component.exceptionForm.get('justification');
    justificationControl?.markAsTouched();
    justificationControl?.setValue('Short');
    expect(component.getErrorMessage('justification')).toContain('at least 20 characters');
  });

  it('should return empty string when field has no errors', () => {
    const justificationControl = component.exceptionForm.get('justification');
    justificationControl?.setValue('This is a valid justification');
    expect(component.getErrorMessage('justification')).toBe('');
  });

  it('should check if form can be submitted', () => {
    component.deploymentId = 'dep-123';
    expect(component.canSubmit()).toBe(false);

    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters'
    });
    expect(component.canSubmit()).toBe(true);
  });

  it('should not allow submission when creating', () => {
    component.deploymentId = 'dep-123';
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters'
    });
    component.creating = true;
    expect(component.canSubmit()).toBe(false);
  });

  it('should get justification character count', () => {
    expect(component.getJustificationCharCount()).toBe(0);
    
    component.exceptionForm.patchValue({
      justification: 'Test'
    });
    expect(component.getJustificationCharCount()).toBe(4);
  });

  it('should check if justification is valid', () => {
    expect(component.isJustificationValid()).toBe(false);
    
    component.exceptionForm.patchValue({
      justification: 'This is a valid justification'
    });
    expect(component.isJustificationValid()).toBe(true);
  });

  it('should parse supporting evidence correctly', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters',
      supportingEvidence: 'doc1, doc2, doc3'
    });

    component.onSubmit();

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.request.supportingEvidence).toEqual(['doc1', 'doc2', 'doc3']);
  });

  it('should handle empty supporting evidence', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    
    component.exceptionForm.patchValue({
      exceptionType: 'COMPLIANCE_WAIVER',
      justification: 'This is a valid justification with more than 20 characters',
      supportingEvidence: ''
    });

    component.onSubmit();

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.request.supportingEvidence).toBeUndefined();
  });

  it('should handle creating state', () => {
    store.overrideSelector(ExceptionSelectors.selectCreatingException, true);
    store.refreshState();
    fixture.detectChanges();
    expect(component.creating).toBe(true);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to create exception';
    store.overrideSelector(ExceptionSelectors.selectCreatingError, errorMessage);
    store.refreshState();
    fixture.detectChanges();
    expect(component.error).toBe(errorMessage);
  });

  it('should have exception type options', () => {
    expect(component.exceptionTypeOptions.length).toBeGreaterThan(0);
    expect(component.exceptionTypeOptions[0].label).toBeDefined();
    expect(component.exceptionTypeOptions[0].value).toBeDefined();
  });

  it('should set minimum date to today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(component.minDate);
    minDate.setHours(0, 0, 0, 0);
    expect(minDate.getTime()).toBe(today.getTime());
  });
});
