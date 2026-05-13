/**
 * Deployment Checklist State Interface
 * Defines the shape of the deployment checklist state slice in the NgRx store
 */

import { DeploymentChecklist } from '../../models/deployment-checklist.model';

export interface ChecklistState {
  checklist: DeploymentChecklist | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: string | null; // ISO UTC
}

export const initialChecklistState: ChecklistState = {
  checklist: null,
  loading: false,
  saving: false,
  error: null,
  lastSavedAt: null
};
