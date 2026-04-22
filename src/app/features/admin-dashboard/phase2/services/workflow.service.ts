import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { WorkflowData, WorkflowResult, WorkflowDraft } from '../models/workflow.models';
import { ApiHeadersService } from '../../../../services/api-headers.service';

/**
 * WorkflowService
 * 
 * Service for workflow operations including draft persistence and submission.
 * 
 * Requirements: 5.5, 5.6, 5.7
 */
@Injectable({
  providedIn: 'root'
})
export class AdminWorkflowService {
  private readonly API_BASE = '/api/workflows';

  constructor(
    private http: HttpClient,
    private apiHeaders: ApiHeadersService
  ) {}

  /**
   * Save workflow draft
   * Requirement 5.5: Draft saving with data persistence
   */
  saveDraft(draft: any): Observable<string> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers => 
        this.http.post<{ draftId: string }>(
          `${this.API_BASE}/drafts`,
          draft,
          { headers }
        )
      ),
      map(response => response.draftId),
      catchError(error => {
        console.error('Failed to save draft:', error);
        throw error;
      })
    );
  }

  /**
   * Load workflow draft
   * Requirement 5.6: Draft loading with exact data restoration
   */
  loadDraft(draftId: string): Observable<WorkflowDraft> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<WorkflowDraft>(
          `${this.API_BASE}/drafts/${draftId}`,
          { headers }
        )
      ),
      catchError(error => {
        console.error('Failed to load draft:', error);
        throw error;
      })
    );
  }

  /**
   * Submit workflow
   * Requirement 5.7: Workflow submission with aggregated step data
   */
  submitWorkflow(workflowData: WorkflowData): Observable<WorkflowResult> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.post<WorkflowResult>(
          this.API_BASE,
          workflowData,
          { headers }
        )
      ),
      catchError(error => {
        console.error('Failed to submit workflow:', error);
        throw error;
      })
    );
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Observable<WorkflowData> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<WorkflowData>(
          `${this.API_BASE}/${workflowId}`,
          { headers }
        )
      ),
      catchError(error => {
        console.error('Failed to get workflow:', error);
        throw error;
      })
    );
  }

  /**
   * Delete workflow draft
   */
  deleteDraft(draftId: string): Observable<void> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.delete<void>(
          `${this.API_BASE}/drafts/${draftId}`,
          { headers }
        )
      ),
      catchError(error => {
        console.error('Failed to delete draft:', error);
        throw error;
      })
    );
  }

  /**
   * List user's workflow drafts
   */
  listDrafts(): Observable<WorkflowDraft[]> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<WorkflowDraft[]>(
          `${this.API_BASE}/drafts`,
          { headers }
        )
      ),
      catchError(error => {
        console.error('Failed to list drafts:', error);
        return of([]);
      })
    );
  }
}
