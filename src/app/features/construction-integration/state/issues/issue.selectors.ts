import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IssueState, issueAdapter } from './issue.state';
import { Issue, IssueSeverity, IssueFilters } from '../../models/construction.models';

export const selectIssueState = createFeatureSelector<IssueState>('constructionIssues');

const { selectAll, selectEntities } = issueAdapter.getSelectors(selectIssueState);

export const selectAllIssues = selectAll;
export const selectIssueEntities = selectEntities;

export const selectSelectedIssueId = createSelector(
  selectIssueState,
  state => state.selectedId
);

export const selectSelectedIssue = createSelector(
  selectIssueEntities,
  selectSelectedIssueId,
  (entities, selectedId) => selectedId ? entities[selectedId] ?? null : null
);

export const selectIssueFilters = createSelector(
  selectIssueState,
  state => state.filters
);

export const selectIssuesLoading = createSelector(
  selectIssueState,
  state => state.loading
);

export const selectIssuesSaving = createSelector(
  selectIssueState,
  state => state.saving
);

export const selectIssuesError = createSelector(
  selectIssueState,
  state => state.error
);

// --- Filtering ---

export function applyIssueFilters(issues: Issue[], filters: IssueFilters): Issue[] {
  return issues.filter(issue => {
    if (filters.severity && issue.severity !== filters.severity) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.projectId && issue.projectId !== filters.projectId) return false;
    return true;
  });
}

export const selectFilteredIssues = createSelector(
  selectAllIssues,
  selectIssueFilters,
  (issues, filters) => applyIssueFilters(issues, filters)
);

export const selectIssuesByProject = (projectId: string) =>
  createSelector(selectAllIssues, issues =>
    issues.filter(issue => issue.projectId === projectId)
  );

// --- Sorting ---

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  [IssueSeverity.CRITICAL]: 0,
  [IssueSeverity.HIGH]: 1,
  [IssueSeverity.MEDIUM]: 2,
  [IssueSeverity.LOW]: 3
};

export type IssueSortField = 'severity' | 'status' | 'createdDate';

export function sortIssues(issues: Issue[], field: IssueSortField, ascending = true): Issue[] {
  const sorted = [...issues].sort((a, b) => {
    let cmp: number;
    switch (field) {
      case 'severity':
        cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'createdDate':
        cmp = a.createdDate.localeCompare(b.createdDate);
        break;
      default:
        cmp = 0;
    }
    return ascending ? cmp : -cmp;
  });
  return sorted;
}

export const selectFilteredIssuesSortedBySeverity = createSelector(
  selectFilteredIssues,
  issues => sortIssues(issues, 'severity')
);

export const selectFilteredIssuesSortedByStatus = createSelector(
  selectFilteredIssues,
  issues => sortIssues(issues, 'status')
);

export const selectFilteredIssuesSortedByDate = createSelector(
  selectFilteredIssues,
  issues => sortIssues(issues, 'createdDate')
);
