/**
 * Deployment Checklist Actions
 * Defines all actions for deployment checklist state management
 */

import { createAction, props } from '@ngrx/store';
import { ChecklistPhase, DeploymentChecklist, EodEntry } from '../../models/deployment-checklist.model';

// Load Checklist
export const loadChecklist = createAction(
  '[Checklist] Load',
  props<{ jobId: string }>()
);

export const loadChecklistSuccess = createAction(
  '[Checklist] Load Success',
  props<{ checklist: DeploymentChecklist }>()
);

export const loadChecklistFailure = createAction(
  '[Checklist] Load Failure',
  props<{ error: string }>()
);

// Save Phase
export const savePhase = createAction(
  '[Checklist] Save Phase',
  props<{ jobId: string; phase: ChecklistPhase; data: any }>()
);

export const savePhaseSuccess = createAction(
  '[Checklist] Save Phase Success',
  props<{ jobId: string; phase: ChecklistPhase; data: any }>()
);

export const savePhaseFailure = createAction(
  '[Checklist] Save Phase Failure',
  props<{ error: string }>()
);

// EOD Entry
export const addEodEntry = createAction(
  '[Checklist] Add EOD Entry',
  props<{ jobId: string; entry: EodEntry }>()
);

export const addEodEntrySuccess = createAction(
  '[Checklist] Add EOD Entry Success',
  props<{ jobId: string; entry: EodEntry }>()
);

export const addEodEntryFailure = createAction(
  '[Checklist] Add EOD Entry Failure',
  props<{ error: string }>()
);

// Auto-create on OnSite transition
export const autoCreateChecklist = createAction(
  '[Checklist] Auto Create',
  props<{ jobId: string }>()
);

export const autoCreateChecklistSuccess = createAction(
  '[Checklist] Auto Create Success',
  props<{ checklist: DeploymentChecklist }>()
);

export const autoCreateChecklistFailure = createAction(
  '[Checklist] Auto Create Failure',
  props<{ error: string }>()
);

// SignalR real-time update
export const checklistUpdatedRemotely = createAction(
  '[Checklist] Updated Remotely',
  props<{ checklist: DeploymentChecklist }>()
);
