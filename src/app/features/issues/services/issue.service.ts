import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { 
  Issue, 
  IssueCreateDto, 
  IssueUpdateDto, 
  IssueQueryDto, 
  IssueStatsDto,
  IssueStatus 
} from '../models/issue.models';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class IssueService {
  private readonly baseUrl = '/api/issues';
  
  // State management for real-time updates
  private issuesSubject = new BehaviorSubject<Issue[]>([]);
  public issues$ = this.issuesSubject.asObservable();
  
  private statsSubject = new BehaviorSubject<IssueStatsDto | null>(null);
  public stats$ = this.statsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // CRUD Operations
  getIssues(query?: IssueQueryDto): Observable<PaginatedResponse<Issue>> {
    let params = new HttpParams();
    
    if (query) {
      if (query.deploymentId) params = params.set('deploymentId', query.deploymentId);
      if (query.status !== undefined) params = params.set('status', query.status.toString());
      if (query.priority !== undefined) params = params.set('priority', query.priority.toString());
      if (query.assignedTo) params = params.set('assignedTo', query.assignedTo);
      if (query.reportedBy) params = params.set('reportedBy', query.reportedBy);
      if (query.page) params = params.set('page', query.page.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    }

    return this.http.get<Issue[]>(this.baseUrl, { 
      params, 
      observe: 'response' 
    }).pipe(
      map((response: HttpResponse<Issue[]>) => {
        const data = response.body || [];
        const total = parseInt(response.headers.get('X-Total-Count') || '0', 10);
        const page = parseInt(response.headers.get('X-Page') || '1', 10);
        const pageSize = parseInt(response.headers.get('X-Page-Size') || '50', 10);
        
        return { data, total, page, pageSize };
      }),
      tap(result => {
        // Update local state if this is the first page
        if (result.page === 1) {
          this.issuesSubject.next(result.data);
        }
      })
    );
  }

  getIssue(id: string): Observable<Issue> {
    return this.http.get<Issue>(`${this.baseUrl}/${id}`);
  }

  createIssue(dto: IssueCreateDto): Observable<string> {
    return this.http.post<string>(this.baseUrl, dto).pipe(
      tap(() => {
        // Refresh issues list after creation
        this.refreshIssues();
      })
    );
  }

  updateIssue(id: string, dto: IssueUpdateDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto).pipe(
      tap(() => {
        // Update local state
        this.updateLocalIssue(id, dto);
      })
    );
  }

  deleteIssue(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        // Remove from local state
        const currentIssues = this.issuesSubject.value;
        const updatedIssues = currentIssues.filter(issue => issue.id !== id);
        this.issuesSubject.next(updatedIssues);
      })
    );
  }

  // Specialized endpoints
  getIssueStats(deploymentId?: string): Observable<IssueStatsDto> {
    let params = new HttpParams();
    if (deploymentId) {
      params = params.set('deploymentId', deploymentId);
    }

    return this.http.get<IssueStatsDto>(`${this.baseUrl}/stats`, { params }).pipe(
      tap(stats => this.statsSubject.next(stats))
    );
  }

  assignIssue(id: string, deploymentEngineerId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/assign`, deploymentEngineerId).pipe(
      tap(() => {
        this.updateLocalIssue(id, { assignedTo: deploymentEngineerId });
      })
    );
  }

  resolveIssue(id: string, resolutionNotes: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resolve`, resolutionNotes).pipe(
      tap(() => {
        this.updateLocalIssue(id, { 
          status: IssueStatus.Resolved, 
          resolutionNotes 
        });
      })
    );
  }

  getIssuesByDeployment(deploymentId: string): Observable<Issue[]> {
    return this.http.get<Issue[]>(`${this.baseUrl}/deployment/${deploymentId}`);
  }

  getMyIssues(status?: IssueStatus): Observable<Issue[]> {
    let params = new HttpParams();
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }

    return this.http.get<Issue[]>(`${this.baseUrl}/my-issues`, { params });
  }

  getAssignedToMe(status?: IssueStatus): Observable<Issue[]> {
    let params = new HttpParams();
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }

    return this.http.get<Issue[]>(`${this.baseUrl}/assigned-to-me`, { params });
  }

  // File upload for issue media
  uploadIssueMedia(issueId: string, files: FileList): Observable<any> {
    const formData = new FormData();
    formData.append('issueId', issueId);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    return this.http.post(`${this.baseUrl}/${issueId}/media`, formData);
  }

  // Real-time update methods (called by SignalR service)
  onIssueCreated(issue: Issue): void {
    const currentIssues = this.issuesSubject.value;
    this.issuesSubject.next([issue, ...currentIssues]);
  }

  onIssueUpdated(issueId: string, updates: Partial<Issue>): void {
    this.updateLocalIssue(issueId, updates);
  }

  onIssueDeleted(issueId: string): void {
    const currentIssues = this.issuesSubject.value;
    const updatedIssues = currentIssues.filter(issue => issue.id !== issueId);
    this.issuesSubject.next(updatedIssues);
  }

  // Helper methods
  private updateLocalIssue(id: string, updates: Partial<Issue>): void {
    const currentIssues = this.issuesSubject.value;
    const updatedIssues = currentIssues.map(issue => 
      issue.id === id ? { ...issue, ...updates } : issue
    );
    this.issuesSubject.next(updatedIssues);
  }

  private refreshIssues(): void {
    // Refresh the current issues list
    this.getIssues({ page: 1, pageSize: 50 }).subscribe();
  }

  // Utility methods for filtering and sorting
  filterIssuesByStatus(issues: Issue[], status: IssueStatus): Issue[] {
    return issues.filter(issue => issue.status === status);
  }

  filterIssuesByPriority(issues: Issue[], priority: number): Issue[] {
    return issues.filter(issue => issue.priority >= priority);
  }

  sortIssuesByPriority(issues: Issue[]): Issue[] {
    return [...issues].sort((a, b) => b.priority - a.priority);
  }

  sortIssuesByCreatedDate(issues: Issue[], ascending = false): Issue[] {
    return [...issues].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  // Search functionality
  searchIssues(issues: Issue[], searchTerm: string): Issue[] {
    if (!searchTerm.trim()) return issues;
    
    const term = searchTerm.toLowerCase();
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(term) ||
      issue.description.toLowerCase().includes(term) ||
      issue.deploymentName.toLowerCase().includes(term) ||
      issue.reportedByName.toLowerCase().includes(term) ||
      issue.assignedToName?.toLowerCase().includes(term)
    );
  }
}
