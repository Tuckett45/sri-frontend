import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { local_environment } from '../../../../environments/environments';
import { JobSummaryData, QuoteWorkflow } from '../models/quote-workflow.model';

/**
 * Service for managing Job Summary persistence.
 *
 * Handles HTTP communication with the backend API for saving
 * and completing Job Summary data within the quote workflow.
 */
@Injectable({ providedIn: 'root' })
export class JobSummaryService {
  private readonly apiUrl = `${local_environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  /**
   * Saves Job Summary data for a quote, updating the workflow status to Job_Summary_In_Progress.
   * @param quoteId Quote identifier
   * @param data Job Summary data including labor line items and estimated hours
   * @returns Observable of the updated QuoteWorkflow
   */
  saveJobSummary(quoteId: string, data: JobSummaryData): Observable<QuoteWorkflow> {
    return this.http.put<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/job-summary`, data);
  }

  /**
   * Marks the Job Summary as complete, triggering the next workflow step (BOM_In_Progress).
   * The backend validates that at least one labor line item exists and total hours > 0
   * before allowing completion.
   * @param quoteId Quote identifier
   * @returns Observable of the updated QuoteWorkflow
   */
  completeJobSummary(quoteId: string): Observable<QuoteWorkflow> {
    return this.http.post<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/job-summary/complete`, {});
  }
}
