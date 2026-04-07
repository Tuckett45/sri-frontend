import { createAction, props } from '@ngrx/store';
import { Issue, IssueFilters, IssueStatus } from '../../models/construction.models';

// Load Issues (with optional filters)
export const loadIssues = createAction(
  '[Construction/Issues] Load Issues',
  props<{ filters?: IssueFilters }>()
);
export const loadIssuesSuccess = createAction(
  '[Construction/Issues] Load Issues Success',
  props<{ issues: Issue[] }>()
);
export const loadIssuesFailure = createAction(
  '[Construction/Issues] Load Issues Failure',
  props<{ error: string }>()
);

// Load Single Issue
export const loadIssue = createAction(
  '[Construction/Issues] Load Issue',
  props<{ id: string }>()
);
export const loadIssueSuccess = createAction(
  '[Construction/Issues] Load Issue Success',
  props<{ issue: Issue }>()
);
export const loadIssueFailure = createAction(
  '[Construction/Issues] Load Issue Failure',
  props<{ error: string }>()
);

// Load Issues by Project
export const loadIssuesByProject = createAction(
  '[Construction/Issues] Load Issues By Project',
  props<{ projectId: string }>()
);
export const loadIssuesByProjectSuccess = createAction(
  '[Construction/Issues] Load Issues By Project Success',
  props<{ issues: Issue[] }>()
);
export const loadIssuesByProjectFailure = createAction(
  '[Construction/Issues] Load Issues By Project Failure',
  props<{ error: string }>()
);

// Create Issue
export const createIssue = createAction(
  '[Construction/Issues] Create Issue',
  props<{ issue: Partial<Issue> }>()
);
export const createIssueSuccess = createAction(
  '[Construction/Issues] Create Issue Success',
  props<{ issue: Issue }>()
);
export const createIssueFailure = createAction(
  '[Construction/Issues] Create Issue Failure',
  props<{ error: string }>()
);

// Update Issue
export const updateIssue = createAction(
  '[Construction/Issues] Update Issue',
  props<{ id: string; issue: Partial<Issue> }>()
);
export const updateIssueSuccess = createAction(
  '[Construction/Issues] Update Issue Success',
  props<{ issue: Issue }>()
);
export const updateIssueFailure = createAction(
  '[Construction/Issues] Update Issue Failure',
  props<{ error: string }>()
);

// Transition Issue Status
export const transitionIssueStatus = createAction(
  '[Construction/Issues] Transition Status',
  props<{ id: string; newStatus: IssueStatus }>()
);
export const transitionIssueStatusSuccess = createAction(
  '[Construction/Issues] Transition Status Success',
  props<{ issue: Issue }>()
);
export const transitionIssueStatusFailure = createAction(
  '[Construction/Issues] Transition Status Failure',
  props<{ error: string }>()
);

// Filters
export const setIssueFilters = createAction(
  '[Construction/Issues] Set Filters',
  props<{ filters: IssueFilters }>()
);
export const clearIssueFilters = createAction(
  '[Construction/Issues] Clear Filters'
);

// Selection
export const selectIssue = createAction(
  '[Construction/Issues] Select Issue',
  props<{ id: string }>()
);
export const clearIssueSelection = createAction(
  '[Construction/Issues] Clear Selection'
);
