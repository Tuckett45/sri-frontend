import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Issue, IssueFilters } from '../../models/construction.models';

export interface IssueState extends EntityState<Issue> {
  selectedId: string | null;
  filters: IssueFilters;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export const issueAdapter: EntityAdapter<Issue> = createEntityAdapter<Issue>({
  selectId: (issue: Issue) => issue.id
});

export const initialIssueState: IssueState = issueAdapter.getInitialState({
  selectedId: null,
  filters: {},
  loading: false,
  saving: false,
  error: null
});
