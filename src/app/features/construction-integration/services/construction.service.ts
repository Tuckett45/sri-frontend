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
    // --- Bulk Labor Support ---
    {
      id: 'p1', name: 'Faith - Pryor, OK', clientName: 'Faith Technologies',
      location: 'Pryor, OK', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-01-15T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p2', name: 'Faith - #2 Site', clientName: 'Faith Technologies',
      location: 'TBD', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-02-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p3', name: 'Google Bulk Labor- Austin (ARK, OK) (2027)', clientName: 'Google',
      location: 'Austin, ARK, OK', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-03-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p4', name: 'Google Bulk Labor (Next - Alex team)', clientName: 'Google',
      location: 'TBD', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-03-15T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p5', name: 'IES -Meta RPL', clientName: 'IES',
      location: 'National', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p6', name: 'IES -Meta Huntsville AL', clientName: 'IES',
      location: 'Huntsville, AL', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p7', name: 'IES - Montgomery AL', clientName: 'IES',
      location: 'Montgomery, AL', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p8', name: 'Directline - New Albany, Ohio', clientName: 'Directline',
      location: 'New Albany, OH', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-05-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p9', name: 'Directline - Meta - RPL (2027)', clientName: 'Directline',
      location: 'TBD', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-05-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p10', name: 'Blackbox - Meta RPL', clientName: 'Blackbox',
      location: 'National', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-06-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p11', name: 'Blackbox - New Albany, Ohio', clientName: 'Blackbox',
      location: 'New Albany, OH', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-06-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p12', name: 'Burr', clientName: 'Burr',
      location: 'TBD', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-06-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p13', name: 'AWS GA', clientName: 'AWS',
      location: 'GA', category: ProjectCategory.BULK_LABOR_SUPPORT,
      createdDate: '2025-06-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    // --- Hyperscale Deployment ---
    {
      id: 'p14', name: 'Google Deployments - National', clientName: 'Google',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-02-01T00:00:00Z', updatedDate: '2025-06-10T00:00:00Z'
    },
    {
      id: 'p15', name: 'AWS Backbone', clientName: 'AWS',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-03-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p16', name: 'Meta Procurement - Houston - Daniel', clientName: 'Meta',
      location: 'Houston, TX', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-03-10T00:00:00Z', updatedDate: '2025-05-20T00:00:00Z'
    },
    {
      id: 'p17', name: 'Meta Edge Deployment (FLM- MAC-D)', clientName: 'Meta',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p18', name: 'Zayo', clientName: 'Zayo',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-04-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    },
    {
      id: 'p19', name: 'Lumen', clientName: 'Lumen',
      location: 'National', category: ProjectCategory.HYPERSCALE_DEPLOYMENT,
      createdDate: '2025-05-01T00:00:00Z', updatedDate: '2025-06-01T00:00:00Z'
    }
  ];

  private allocations: ResourceAllocation[] = [
    // Faith - Pryor, OK (p1) - 2026
    { id: 'a1', projectId: 'p1', year: 2026, month: 1, headcount: 12 },
    { id: 'a2', projectId: 'p1', year: 2026, month: 2, headcount: 12 },
    { id: 'a3', projectId: 'p1', year: 2026, month: 3, headcount: 12 },
    { id: 'a4', projectId: 'p1', year: 2026, month: 4, headcount: 12 },
    { id: 'a5', projectId: 'p1', year: 2026, month: 5, headcount: 12 },
    { id: 'a6', projectId: 'p1', year: 2026, month: 6, headcount: 40 },
    { id: 'a7', projectId: 'p1', year: 2026, month: 7, headcount: 40 },
    { id: 'a8', projectId: 'p1', year: 2026, month: 8, headcount: 40 },
    { id: 'a9', projectId: 'p1', year: 2026, month: 9, headcount: 40 },
    { id: 'a10', projectId: 'p1', year: 2026, month: 10, headcount: 40 },
    { id: 'a11', projectId: 'p1', year: 2026, month: 11, headcount: 40 },
    { id: 'a12', projectId: 'p1', year: 2026, month: 12, headcount: 40 },
    // Faith - #2 Site (p2) - 2026
    { id: 'a13', projectId: 'p2', year: 2026, month: 4, headcount: 10 },
    { id: 'a14', projectId: 'p2', year: 2026, month: 5, headcount: 15 },
    { id: 'a15', projectId: 'p2', year: 2026, month: 6, headcount: 15 },
    { id: 'a16', projectId: 'p2', year: 2026, month: 7, headcount: 15 },
    { id: 'a17', projectId: 'p2', year: 2026, month: 8, headcount: 15 },
    { id: 'a18', projectId: 'p2', year: 2026, month: 9, headcount: 15 },
    { id: 'a19', projectId: 'p2', year: 2026, month: 10, headcount: 15 },
    { id: 'a20', projectId: 'p2', year: 2026, month: 11, headcount: 15 },
    { id: 'a21', projectId: 'p2', year: 2026, month: 12, headcount: 15 },
    // Google Bulk Labor- Austin (ARK, OK) (2027) (p3) - 2026
    { id: 'a22', projectId: 'p3', year: 2026, month: 11, headcount: 80 },
    { id: 'a23', projectId: 'p3', year: 2026, month: 12, headcount: 80 },
    // IES -Meta RPL (p5) - 2026
    { id: 'a24', projectId: 'p5', year: 2026, month: 8, headcount: 8 },
    { id: 'a25', projectId: 'p5', year: 2026, month: 9, headcount: 12 },
    { id: 'a26', projectId: 'p5', year: 2026, month: 10, headcount: 25 },
    { id: 'a27', projectId: 'p5', year: 2026, month: 11, headcount: 50 },
    { id: 'a28', projectId: 'p5', year: 2026, month: 12, headcount: 75 },
    // IES -Meta Huntsville AL (p6) - 2026
    { id: 'a29', projectId: 'p6', year: 2026, month: 3, headcount: 30 },
    { id: 'a30', projectId: 'p6', year: 2026, month: 4, headcount: 30 },
    { id: 'a31', projectId: 'p6', year: 2026, month: 5, headcount: 30 },
    { id: 'a32', projectId: 'p6', year: 2026, month: 6, headcount: 30 },
    { id: 'a33', projectId: 'p6', year: 2026, month: 7, headcount: 30 },
    { id: 'a34', projectId: 'p6', year: 2026, month: 8, headcount: 30 },
    { id: 'a35', projectId: 'p6', year: 2026, month: 9, headcount: 30 },
    { id: 'a36', projectId: 'p6', year: 2026, month: 10, headcount: 30 },
    { id: 'a37', projectId: 'p6', year: 2026, month: 11, headcount: 30 },
    { id: 'a38', projectId: 'p6', year: 2026, month: 12, headcount: 30 },
    // IES - Montgomery AL (p7) - 2026
    { id: 'a39', projectId: 'p7', year: 2026, month: 5, headcount: 20 },
    { id: 'a40', projectId: 'p7', year: 2026, month: 6, headcount: 20 },
    { id: 'a41', projectId: 'p7', year: 2026, month: 7, headcount: 20 },
    { id: 'a42', projectId: 'p7', year: 2026, month: 8, headcount: 40 },
    { id: 'a43', projectId: 'p7', year: 2026, month: 9, headcount: 60 },
    { id: 'a44', projectId: 'p7', year: 2026, month: 10, headcount: 60 },
    { id: 'a45', projectId: 'p7', year: 2026, month: 11, headcount: 60 },
    { id: 'a46', projectId: 'p7', year: 2026, month: 12, headcount: 60 },
    // Directline - New Albany, Ohio (p8) - 2026
    { id: 'a47', projectId: 'p8', year: 2026, month: 9, headcount: 12 },
    { id: 'a48', projectId: 'p8', year: 2026, month: 10, headcount: 16 },
    { id: 'a49', projectId: 'p8', year: 2026, month: 11, headcount: 20 },
    { id: 'a50', projectId: 'p8', year: 2026, month: 12, headcount: 24 },
    // Blackbox - Meta RPL (p10) - 2026
    { id: 'a51', projectId: 'p10', year: 2026, month: 10, headcount: 12 },
    { id: 'a52', projectId: 'p10', year: 2026, month: 11, headcount: 16 },
    { id: 'a53', projectId: 'p10', year: 2026, month: 12, headcount: 20 },
    // Blackbox - New Albany, Ohio (p11) - 2026
    { id: 'a54', projectId: 'p11', year: 2026, month: 3, headcount: 3 },
    { id: 'a55', projectId: 'p11', year: 2026, month: 4, headcount: 3 },
    { id: 'a56', projectId: 'p11', year: 2026, month: 5, headcount: 3 },
    { id: 'a57', projectId: 'p11', year: 2026, month: 6, headcount: 6 },
    { id: 'a58', projectId: 'p11', year: 2026, month: 7, headcount: 6 },
    { id: 'a59', projectId: 'p11', year: 2026, month: 8, headcount: 6 },
    { id: 'a60', projectId: 'p11', year: 2026, month: 9, headcount: 12 },
    { id: 'a61', projectId: 'p11', year: 2026, month: 10, headcount: 16 },
    { id: 'a62', projectId: 'p11', year: 2026, month: 11, headcount: 20 },
    { id: 'a63', projectId: 'p11', year: 2026, month: 12, headcount: 24 },
    // AWS Backbone (p15) - 2026
    { id: 'a64', projectId: 'p15', year: 2026, month: 1, headcount: 3 },
    { id: 'a65', projectId: 'p15', year: 2026, month: 2, headcount: 3 },
    { id: 'a66', projectId: 'p15', year: 2026, month: 3, headcount: 3 },
    { id: 'a67', projectId: 'p15', year: 2026, month: 4, headcount: 3 },
    { id: 'a68', projectId: 'p15', year: 2026, month: 5, headcount: 3 },
    { id: 'a69', projectId: 'p15', year: 2026, month: 6, headcount: 3 },
    { id: 'a70', projectId: 'p15', year: 2026, month: 7, headcount: 3 },
    { id: 'a71', projectId: 'p15', year: 2026, month: 8, headcount: 3 },
    { id: 'a72', projectId: 'p15', year: 2026, month: 9, headcount: 3 },
    { id: 'a73', projectId: 'p15', year: 2026, month: 10, headcount: 3 },
    { id: 'a74', projectId: 'p15', year: 2026, month: 11, headcount: 3 },
    { id: 'a75', projectId: 'p15', year: 2026, month: 12, headcount: 3 },
    // Zayo (p18) - 2026
    { id: 'a76', projectId: 'p18', year: 2026, month: 6, headcount: 3 },
    { id: 'a77', projectId: 'p18', year: 2026, month: 7, headcount: 3 },
    { id: 'a78', projectId: 'p18', year: 2026, month: 8, headcount: 12 },
    { id: 'a79', projectId: 'p18', year: 2026, month: 9, headcount: 3 },
    { id: 'a80', projectId: 'p18', year: 2026, month: 10, headcount: 3 },
    { id: 'a81', projectId: 'p18', year: 2026, month: 11, headcount: 3 },
    { id: 'a82', projectId: 'p18', year: 2026, month: 12, headcount: 3 },
  ];

  private issues: Issue[] = [
    {
      id: 'i1', projectId: 'p1', description: 'Permit delays in Pryor county',
      severity: IssueSeverity.HIGH, status: IssueStatus.OPEN,
      assignedUserId: 'u1', createdDate: '2026-01-20T00:00:00Z', updatedDate: '2026-01-20T00:00:00Z'
    },
    {
      id: 'i2', projectId: 'p14', description: 'Fiber splice equipment shortage',
      severity: IssueSeverity.CRITICAL, status: IssueStatus.IN_PROGRESS,
      assignedUserId: 'u2', createdDate: '2026-02-05T00:00:00Z', updatedDate: '2026-02-10T00:00:00Z'
    },
    {
      id: 'i3', projectId: 'p16', description: 'Weather delay - Southeast corridor',
      severity: IssueSeverity.MEDIUM, status: IssueStatus.RESOLVED,
      assignedUserId: null, createdDate: '2026-03-01T00:00:00Z', updatedDate: '2026-03-15T00:00:00Z'
    },
    {
      id: 'i4', projectId: 'p1', description: 'Subcontractor scheduling conflict',
      severity: IssueSeverity.LOW, status: IssueStatus.CLOSED,
      assignedUserId: 'u1', createdDate: '2025-12-10T00:00:00Z', updatedDate: '2026-01-05T00:00:00Z'
    },
    {
      id: 'i5', projectId: 'p6', description: 'Material delivery delayed from vendor',
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
