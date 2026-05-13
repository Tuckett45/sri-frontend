import { TestBed } from '@angular/core/testing';
import { UnsavedChangesGuard, HasUnsavedChanges } from './unsaved-changes.guard';

describe('UnsavedChangesGuard', () => {
  let guard: UnsavedChangesGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UnsavedChangesGuard]
    });
    guard = TestBed.inject(UnsavedChangesGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow deactivation when component has no unsaved changes', () => {
    const component: HasUnsavedChanges = { hasUnsavedChanges: () => false };
    expect(guard.canDeactivate(component)).toBe(true);
  });

  it('should show confirm dialog when component has unsaved changes', () => {
    const component: HasUnsavedChanges = { hasUnsavedChanges: () => true };
    spyOn(window, 'confirm').and.returnValue(true);

    const result = guard.canDeactivate(component);

    expect(window.confirm).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to leave this page?'
    );
    expect(result).toBe(true);
  });

  it('should block deactivation when user cancels confirm dialog', () => {
    const component: HasUnsavedChanges = { hasUnsavedChanges: () => true };
    spyOn(window, 'confirm').and.returnValue(false);

    const result = guard.canDeactivate(component);

    expect(window.confirm).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('should allow deactivation when component does not implement hasUnsavedChanges', () => {
    const component = {} as HasUnsavedChanges;
    expect(guard.canDeactivate(component)).toBe(true);
  });
});
