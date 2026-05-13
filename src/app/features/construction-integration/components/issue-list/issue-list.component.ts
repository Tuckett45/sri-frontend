import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../../services/auth.service';
import { CsvExportService } from '../../services/csv-export.service';
import {
  Issue,
  IssueFilters,
  IssueSeverity,
  IssueStatus,
  Project
} from '../../models/construction.models';
import * as IssueActions from '../../state/issues/issue.actions';
import * as ProjectActions from '../../state/projects/project.actions';
import {
  selectFilteredIssues,
  selectIssueFilters,
  selectIssuesLoading,
  selectIssuesError
} from '../../state/issues/issue.selectors';
import { selectAllProjects } from '../../state/projects/project.selectors';

@Component({
  selector: 'app-issue-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.scss']
})
export class IssueListComponent implements OnInit, OnDestroy {
  isAdmin = false;

  issues$!: Observable<Issue[]>;
  projects$!: Observable<Project[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  filters$!: Observable<IssueFilters>;

  readonly severities = Object.values(IssueSeverity);
  readonly statuses = Object.values(IssueStatus);

  sortField: 'severity' | 'status' | 'createdDate' | '' = '';
  sortAscending = true;

  filterSeverity = '';
  filterStatus = '';
  filterProjectId = '';

  private projectMap = new Map<string, string>();
  private subscriptions = new Subscription();

  constructor(
    private store: Store,
    private authService: AuthService,
    private csvExportService: CsvExportService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.store.dispatch(ProjectActions.loadProjects());
    this.store.dispatch(IssueActions.loadIssues({}));

    this.projects$ = this.store.select(selectAllProjects);
    this.loading$ = this.store.select(selectIssuesLoading);
    this.error$ = this.store.select(selectIssuesError);
    this.filters$ = this.store.select(selectIssueFilters);

    this.issues$ = this.store.select(selectFilteredIssues).pipe(
      map(issues => this.applySorting(issues))
    );

    this.subscriptions.add(
      this.projects$.subscribe(projects => {
        this.projectMap.clear();
        projects.forEach(p => this.projectMap.set(p.id, p.name));
      })
    );

    this.subscriptions.add(
      this.filters$.subscribe(filters => {
        this.filterSeverity = filters.severity || '';
        this.filterStatus = filters.status || '';
        this.filterProjectId = filters.projectId || '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onFilterChange(): void {
    const filters: IssueFilters = {};
    if (this.filterSeverity) filters.severity = this.filterSeverity as IssueSeverity;
    if (this.filterStatus) filters.status = this.filterStatus as IssueStatus;
    if (this.filterProjectId) filters.projectId = this.filterProjectId;
    this.store.dispatch(IssueActions.setIssueFilters({ filters }));
  }

  clearFilters(): void {
    this.filterSeverity = '';
    this.filterStatus = '';
    this.filterProjectId = '';
    this.store.dispatch(IssueActions.clearIssueFilters());
  }

  toggleSort(field: 'severity' | 'status' | 'createdDate'): void {
    if (this.sortField === field) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortField = field;
      this.sortAscending = true;
    }
    // Re-trigger the observable by re-dispatching current filters
    this.onFilterChange();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'pi pi-sort-alt';
    return this.sortAscending ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
  }

  getProjectName(projectId: string): string {
    return this.projectMap.get(projectId) || projectId;
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity.toLowerCase()}`;
  }

  exportIssues(issues: Issue[]): void {
    this.csvExportService.exportIssues(issues);
  }

  private applySorting(issues: Issue[]): Issue[] {
    if (!this.sortField) return issues;
    const SEVERITY_ORDER: Record<string, number> = {
      CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3
    };
    return [...issues].sort((a, b) => {
      let cmp: number;
      switch (this.sortField) {
        case 'severity':
          cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
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
      return this.sortAscending ? cmp : -cmp;
    });
  }
}
