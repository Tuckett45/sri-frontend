import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<HasUnsavedChanges> {
  canDeactivate(component: HasUnsavedChanges): boolean {
    if (component.hasUnsavedChanges && component.hasUnsavedChanges()) {
      return confirm('You have unsaved changes. Are you sure you want to leave this page?');
    }
    return true;
  }
}
