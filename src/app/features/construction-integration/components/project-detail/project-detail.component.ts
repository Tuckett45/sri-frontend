import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { Project, Issue, ResourceAllocation, ProjectCategory } from '../../models/construction.models';
import * as ProjectActions from '../../state/projects/project.actions';
import * as AllocationActions from '../../state/allocations/allocation.actions';
import * as IssueActions from '../../state/issues/issue.actions';
import { selectSelectedProject, selectProjectsLoading, selectProjectsError } from '../../state/projects/project.selectors';
import { selectAllAllocations, selectSelectedYear, selectAllocationsLoading } from '../../state/allocations/allocation.selectors';
import { selectIssuesByProject, selectIssuesLoading } from '../../state/issues/issue.selectors';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  readonly MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  isAdmin = false;
  project$!: Observable<Project | null | undefined>;
  projectLoading$!: Observable<boolean>;
  projectError$!: Observable<string | null>;
  allocations$!: Observable<ResourceAllocation[]>;
  allocationsLoading$!: Observable<boolean>;
  selectedYear$!: Observable<number>;
  issues$!: Observable<Issue[]>;
  issuesLoading$!: Observable<boolean>;

  private projectId = '';

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';

    this.store.dispatch(ProjectActions.selectProject({ id: this.projectId }));
    this.store.dispatch(ProjectActions.loadProject({ id: this.projectId }));
    this.store.dispatch(IssueActions.loadIssuesByProject({ projectId: this.projectId }));

    const currentYear = new Date().getFullYear();
    this.store.dispatch(AllocationActions.loadAllocations({ year: currentYear }));

    this.project$ = this.store.select(selectSelectedProject);
    this.projectLoading$ = this.store.select(selectProjectsLoading);
    this.projectError$ = this.store.select(selectProjectsError);
    this.selectedYear$ = this.store.select(selectSelectedYear);
    this.allocationsLoading$ = this.store.select(selectAllocationsLoading);
    this.issues$ = this.store.select(selectIssuesByProject(this.projectId));
    this.issuesLoading$ = this.store.select(selectIssuesLoading);

    this.allocations$ = this.store.select(selectAllAllocations).pipe(
      map(allocs => allocs.filter(a => a.projectId === this.projectId))
    );
  }

  getCategoryLabel(category: ProjectCategory): string {
    return category === ProjectCategory.BULK_LABOR_SUPPORT
      ? 'Bulk Labor Support'
      : 'Hyperscale Deployment';
  }

  getMonthHeadcount(allocations: ResourceAllocation[], month: number): number {
    const alloc = allocations.find(a => a.month === month);
    return alloc ? alloc.headcount : 0;
  }

  getAllocationTotal(allocations: ResourceAllocation[]): number {
    return allocations.reduce((sum, a) => sum + a.headcount, 0);
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity.toLowerCase()}`;
  }
}
