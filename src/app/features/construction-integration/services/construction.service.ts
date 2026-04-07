import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Project,
  ResourceAllocation,
  Issue,
  IssueFilters,
  IssueStatus,
  IssueSeverity,
  ProjectCategory,
  VALID_STATUS_TRANSITIONS
} from '../models/construction.models';

@Injectable()
export class ConstructionService {
  private projects: Project[] = [
    {
      id: 'p1', name: 'Faith - Pryor, OK', clientName: 'Faith Technologies',
      location: 'Pryor, OK', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-01-15T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p2', name: 'Google Deployments - National', clientName: 'Google',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-02-01T00:00:00Z', updatedDate: '2025-06-10T00:00:00Z'
    },
    {
      id: 'p3', name: 'Meta Backbone - Southeast', clientName: 'Meta',
      location: 'Southeast US', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-03-10T00:00:00Z', updatedDate: '2025-05-20T00:00:00Z'
    },
    {
      id: 'p4', name: 'Mastec - Dallas, TX', clientName: 'Mastec',
      location: 'Dallas, TX', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-15T00:00:00Z'
    }
  ];

  private allocations: ResourceAllocation[] = [
    // Faith - Pryor (p1) - 2026
    { id: 'a1', projectId: 'p1', year: 2026, month: 1, headcount: 12 },
    { id: 'a2', projectId: 'p1', year: 2026, month: 2, headcount: 14 },
    { id: 'a3', projectId: 'p1', year: 2026, month: 3, headcount: 18 },
    { id: 'a4', projectId: 'p1', year: 2026, month: 4, headcount: 20 },
    { id: 'a5', projectId: 'p1', year: 2026, month: 5, headcount: 22 },
    { id: 'a6', projectId: 'p1', year: 2026, month: 6, headcount: 20 },
    { id: 'a7', projectId: 'p1', year: 2026, month: 7, headcount: 18 },
    { id: 'a8', projectId: 'p1', year: 2026, month: 8, headcount: 15 },
    { id: 'a9', projectId: 'p1', year: 2026, month: 9, headcount: 12 },
    { id: 'a10', projectId: 'p1', year: 2026, month: 10, headcount: 10 },
    { id: 'a11', projectId: 'p1', year: 2026, month: 11, headcount: 8 },
    { id: 'a12', projectId: 'p1', year: 2026, month: 12, headcount: 6 },
    // Google Deployments (p2) - 2026
    { id: 'a13', projectId: 'p2', year: 2026, month: 1, headcount: 30 },
    { id: 'a14', projectId: 'p2', year: 2026, month: 2, headcount: 35 },
    { id: 'a15', projectId: 'p2', year: 2026, month: 3, headcount: 40 },
    { id: 'a16', projectId: 'p2', year: 2026, month: 4, headcount: 45 },
    { id: 'a17', projectId: 'p2', year: 2026, month: 5, headcount: 50 },
    { id: 'a18', projectId: 'p2', year: 2026, month: 6, headcount: 48 },
    { id: 'a19', projectId: 'p2', year: 2026, month: 7, headcount: 45 },
    { id: 'a20', projectId: 'p2', year: 2026, month: 8, headcount: 42 },
    { id: 'a21', projectId: 'p2', year: 2026, month: 9, headcount: 38 },
    { id: 'a22', projectId: 'p2', year: 2026, month: 10, headcount: 35 },
    { id: 'a23', projectId: 'p2', year: 2026, month: 11, headcount: 30 },
    { id: 'a24', projectId: 'p2', year: 2026, month: 12, headcount: 25 },
    // Meta Backbone (p3) - 2026
    { id: 'a25', projectId: 'p3', year: 2026, month: 1, headcount: 8 },
    { id: 'a26', projectId: 'p3', year: 2026, month: 2, headcount: 10 },
    { id: 'a27', projectId: 'p3', year: 2026, month: 3, headcount: 15 },
    { id: 'a28', projectId: 'p3', year: 2026, month: 4, headcount: 20 },
    { id: 'a29', projectId: 'p3', year: 2026, month: 5, headcount: 25 },
    { id: 'a30', projectId: 'p3', year: 2026, month: 6, headcount: 28 },
    // Mastec (p4) - 2026
    { id: 'a31', projectId: 'p4', year: 2026, month: 1, headcount: 5 },
    { id: 'a32', projectId: 'p4', year: 2026, month: 2, headcount: 8 },
    { id: 'a33', projectId: 'p4', year: 2026, month: 3, headcount: 10 },
    { id: 'a34', projectId: 'p4', year: 2026, month: 4, headcount: 12 },
    { id: 'a35', projectId: 'p4', year: 2026, month: 5, headcount: 15 },
    { id: 'a36', projectId: 'p4', year: 2026, month: 6, headcount: 14 },
  ];

  private issues: Issue[] = [
    {
      id: 'i1', projectId: 'p1', description: 'Permit delays in Pryor county',
      severity: IssueSeverity.HIGH, status: IssueStatus.OPEN,
      assignedUserId: 'u1', createdDate: '2026-01-20T00:00:00Z', updatedDate: '2026-01-20T00:00:00Z'
    },
    {
      id: 'i2', projectId: 'p2', description: 'Fiber splice equipment shortage',
      severity: IssueSeverity.CRITICAL, status: IssueStatus.IN_PROGRESS,
      assignedUserId: 'u2', createdDate: '2026-02-05T00:00:00Z', updatedDate: '2026-02-10T00:00:00Z'
    },
    {
      id: 'i3', projectId: 'p3', description: 'Weather delay - Southeast corridor',
      severity: IssueSeverity.MEDIUM, status: IssueStatus.RESOLVED,
      assignedUserId: null, createdDate: '2026-03-01T00:00:00Z', updatedDate: '2026-03-15T00:00:00Z'
    },
    {
      id: 'i4', projectId: 'p1', description: 'Subcontractor scheduling conflict',
      severity: IssueSeverity.LOW, status: IssueStatus.CLOSED,
      assignedUserId: 'u1', createdDate: '2025-12-10T00:00:00Z', updatedDate: '2026-01-05T00:00:00Z'
    },
    {
      id: 'i5', projectId: 'p4', description: 'Material delivery delayed from vendor',
      severity: IssueSeverity.HIGH, status: IssueStatus.OPEN,
      assignedUserId: 'u3', createdDate: '2026-03-20T00:00:00Z', updatedDate: '2026-03-20T00:00:00Z'
    }
  ];

  private nextId = 100;

  // --- Projects ---

  getProjects(): Observable<Project[]> {
    return of([...this.projects]).pipe(delay(200));
  }

  getProject(id: string): Observable<Project> {
    const project = this.projects.find(p => p.id === id);
    if (!project) {
      return throwError(() => new Error(`Project ${id} not found`));
    }
    return of({ ...project }).pipe(delay(200));
  }

  createProject(project: Partial<Project>): Observable<Project> {
    const newProject: Project = {
      id: `p${this.nextId++}`,
      name: project.name || '',
      clientName: project.clientName || '',
      location: project.location || '',
      category: project.category || ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };
    this.projects.push(newProject);
    return of({ ...newProject }).pipe(delay(300));
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Project ${id} not found`));
    }
    this.projects[index] = { ...this.projects[index], ...project, updatedDate: new Date().toISOString() };
    return of({ ...this.projects[index] }).pipe(delay(300));
  }

  // --- Allocations ---

  getAllocations(year: number): Observable<ResourceAllocation[]> {
    const filtered = this.allocations.filter(a => a.year === year);
    return of([...filtered]).pipe(delay(200));
  }

  getAllocationsByProject(projectId: string, year: number): Observable<ResourceAllocation[]> {
    const filtered = this.allocations.filter(a => a.projectId === projectId && a.year === year);
    return of([...filtered]).pipe(delay(200));
  }

  updateAllocation(allocation: ResourceAllocation): Observable<ResourceAllocation> {
    const index = this.allocations.findIndex(a => a.id === allocation.id);
    if (index !== -1) {
      this.allocations[index] = { ...allocation };
    } else {
      const newAlloc = { ...allocation, id: `a${this.nextId++}` };
      this.allocations.push(newAlloc);
      return of({ ...newAlloc }).pipe(delay(300));
    }
    return of({ ...this.allocations[index] }).pipe(delay(300));
  }

  // --- Issues ---

  getIssues(filters?: IssueFilters): Observable<Issue[]> {
    let result = [...this.issues];
    if (filters?.severity) {
      result = result.filter(i => i.severity === filters.severity);
    }
    if (filters?.status) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters?.projectId) {
      result = result.filter(i => i.projectId === filters.projectId);
    }
    return of(result).pipe(delay(200));
  }

  getIssue(id: string): Observable<Issue> {
    const issue = this.issues.find(i => i.id === id);
    if (!issue) {
      return throwError(() => new Error(`Issue ${id} not found`));
    }
    return of({ ...issue }).pipe(delay(200));
  }

  getIssuesByProject(projectId: string): Observable<Issue[]> {
    const filtered = this.issues.filter(i => i.projectId === projectId);
    return of([...filtered]).pipe(delay(200));
  }

  createIssue(issue: Partial<Issue>): Observable<Issue> {
    const newIssue: Issue = {
      id: `i${this.nextId++}`,
      projectId: issue.projectId || '',
      description: issue.description || '',
      severity: issue.severity || IssueSeverity.LOW,
      status: IssueStatus.OPEN,
      assignedUserId: issue.assignedUserId || null,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };
    this.issues.push(newIssue);
    return of({ ...newIssue }).pipe(delay(300));
  }

  updateIssue(id: string, issue: Partial<Issue>): Observable<Issue> {
    const index = this.issues.findIndex(i => i.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Issue ${id} not found`));
    }
    this.issues[index] = { ...this.issues[index], ...issue, updatedDate: new Date().toISOString() };
    return of({ ...this.issues[index] }).pipe(delay(300));
  }

  transitionIssueStatus(id: string, newStatus: IssueStatus): Observable<Issue> {
    const index = this.issues.findIndex(i => i.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Issue ${id} not found`));
    }
    const current = this.issues[index];
    const allowed = VALID_STATUS_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      return throwError(() => new Error(
        `Cannot transition from ${current.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`
      ));
    }
    this.issues[index] = { ...current, status: newStatus, updatedDate: new Date().toISOString() };
    return of({ ...this.issues[index] }).pipe(delay(300));
  }
}
