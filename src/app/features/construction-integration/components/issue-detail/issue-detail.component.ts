import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { Issue, IssueStatus, VALID_STATUS_TRANSITIONS, Project } from '../../models/construction.models';
import * as IssueActions from '../../state/issues/issue.actions';
import {
  selectSelectedIssue,
  selectIssuesLoading,
  selectIssuesSaving,
  selectIssuesError
} from '../../state/issues/issue.selectors';
import { selectProjectEntities } from '../../state/projects/project.selectors';
import * as ProjectActions from '../../state/projects/project.actions';
import { map } from 'rxjs/operators';
import { Dictionary } from '@ngrx/entity';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss'],
})
export class IssueDetailComponent implements OnInit {
  isAdmin = false;
  issue$!: Observable<Issue | null | undefined>;
  loading$!: Observable<boolean>;
  saving$!: Observable<boolean>;
  error$!: Observable<string | null>;
  projectEntities$!: Observable<Dictionary<Project>>;

  private issueId = '';

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.issueId = this.route.snapshot.paramMap.get('issueId') || '';

    this.store.dispatch(IssueActions.selectIssue({ id: this.issueId }));
    this.store.dispatch(IssueActions.loadIssue({ id: this.issueId }));
    this.store.dispatch(ProjectActions.loadProjects());

    this.issue$ = this.store.select(selectSelectedIssue);
    this.loading$ = this.store.select(selectIssuesLoading);
    this.saving$ = this.store.select(selectIssuesSaving);
    this.error$ = this.store.select(selectIssuesError);
    this.projectEntities$ = this.store.select(selectProjectEntities);
  }

  getValidTransitions(status: IssueStatus): IssueStatus[] {
    return VALID_STATUS_TRANSITIONS[status] || [];
  }

  getTransitionLabel(status: IssueStatus): string {
    switch (status) {
      case IssueStatus.IN_PROGRESS: return 'Start Progress';
      case IssueStatus.RESOLVED: return 'Resolve';
      case IssueStatus.CLOSED: return 'Close';
      default: return status;
    }
  }

  transitionStatus(issueId: string, newStatus: IssueStatus): void {
    this.store.dispatch(IssueActions.transitionIssueStatus({ id: issueId, newStatus }));
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity.toLowerCase()}`;
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  getProjectName(projectId: string, entities: Dictionary<Project>): string {
    return entities[projectId]?.name || projectId;
  }
}
