/**
 * Assignments API Service
 * Handles communication with atlas-platform assignment inbox endpoints
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';

export interface UserAssignment {
  id: string;
  type: string;
  title: string;
  description: string | null;
  assignedToUserId: string;
  assignedByUserId: string | null;
  assignedByName: string | null;
  sourceId: string | null;
  sourceType: string | null;
  priority: string;
  status: string;
  link: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AssignmentCount {
  pendingCount: number;
}

export interface AssignmentSummary {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface PaginatedAssignments {
  items: UserAssignment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AssignmentFilters {
  type?: string;
  priority?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AssignmentsApiService {
  private readonly apiUrl = `${environment.atlasApiUrl}/assignments`;

  constructor(private http: HttpClient) {}

  getMyAssignments(filters: AssignmentFilters = {}): Observable<PaginatedAssignments> {
    let params = new HttpParams();
    if (filters.type) params = params.set('type', filters.type);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());

    return this.http.get<PaginatedAssignments>(this.apiUrl, { params });
  }

  getPendingCount(): Observable<AssignmentCount> {
    return this.http.get<AssignmentCount>(`${this.apiUrl}/count`);
  }

  getSummary(): Observable<AssignmentSummary> {
    return this.http.get<AssignmentSummary>(`${this.apiUrl}/summary`);
  }

  complete(assignmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${assignmentId}/complete`, {});
  }

  dismiss(assignmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${assignmentId}/dismiss`, {});
  }
}
