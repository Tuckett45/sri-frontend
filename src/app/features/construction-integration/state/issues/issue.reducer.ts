import { createReducer, on } from '@ngrx/store';
import { IssueState, issueAdapter, initialIssueState } from './issue.state';
import * as IssueActions from './issue.actions';

export const issueReducer = createReducer(
  initialIssueState,

  // Load Issues
  on(IssueActions.loadIssues, (state, { filters }): IssueState => ({
    ...state,
    filters: filters || {},
    loading: true,
    error: null
  })),
  on(IssueActions.loadIssuesSuccess, (state, { issues }): IssueState =>
    issueAdapter.setAll(issues, { ...state, loading: false, error: null })
  ),
  on(IssueActions.loadIssuesFailure, (state, { error }): IssueState => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Issue
  on(IssueActions.loadIssue, (state): IssueState => ({
    ...state,
    loading: true,
    error: null
  })),
  on(IssueActions.loadIssueSuccess, (state, { issue }): IssueState =>
    issueAdapter.upsertOne(issue, { ...state, loading: false, error: null })
  ),
  on(IssueActions.loadIssueFailure, (state, { error }): IssueState => ({
    ...state,
    loading: false,
    error
  })),

  // Load Issues by Project
  on(IssueActions.loadIssuesByProject, (state): IssueState => ({
    ...state,
    loading: true,
    error: null
  })),
  on(IssueActions.loadIssuesByProjectSuccess, (state, { issues }): IssueState =>
    issueAdapter.setAll(issues, { ...state, loading: false, error: null })
  ),
  on(IssueActions.loadIssuesByProjectFailure, (state, { error }): IssueState => ({
    ...state,
    loading: false,
    error
  })),

  // Create Issue
  on(IssueActions.createIssue, (state): IssueState => ({
    ...state,
    saving: true,
    error: null
  })),
  on(IssueActions.createIssueSuccess, (state, { issue }): IssueState =>
    issueAdapter.addOne(issue, { ...state, saving: false, error: null })
  ),
  on(IssueActions.createIssueFailure, (state, { error }): IssueState => ({
    ...state,
    saving: false,
    error
  })),

  // Update Issue
  on(IssueActions.updateIssue, (state): IssueState => ({
    ...state,
    saving: true,
    error: null
  })),
  on(IssueActions.updateIssueSuccess, (state, { issue }): IssueState =>
    issueAdapter.upsertOne(issue, { ...state, saving: false, error: null })
  ),
  on(IssueActions.updateIssueFailure, (state, { error }): IssueState => ({
    ...state,
    saving: false,
    error
  })),

  // Transition Status
  on(IssueActions.transitionIssueStatus, (state): IssueState => ({
    ...state,
    saving: true,
    error: null
  })),
  on(IssueActions.transitionIssueStatusSuccess, (state, { issue }): IssueState =>
    issueAdapter.upsertOne(issue, { ...state, saving: false, error: null })
  ),
  on(IssueActions.transitionIssueStatusFailure, (state, { error }): IssueState => ({
    ...state,
    saving: false,
    error
  })),

  // Filters
  on(IssueActions.setIssueFilters, (state, { filters }): IssueState => ({
    ...state,
    filters
  })),
  on(IssueActions.clearIssueFilters, (state): IssueState => ({
    ...state,
    filters: {}
  })),

  // Selection
  on(IssueActions.selectIssue, (state, { id }): IssueState => ({
    ...state,
    selectedId: id
  })),
  on(IssueActions.clearIssueSelection, (state): IssueState => ({
    ...state,
    selectedId: null
  }))
);
