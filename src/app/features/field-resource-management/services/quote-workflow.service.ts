import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { local_environment } from '../../../../environments/environments';
import {
  ConvertToJobData,
  DeliveryRecord,
  QuoteFilters,
  QuoteStep,
  QuoteWorkflow,
  RfpRecord
} from '../models/quote-workflow.model';
import { Job } from '../models/job.model';

/**
 * Draft storage shape persisted to sessionStorage.
 */
interface QuoteDraft {
  formValue: any;
  savedAt: string; // ISO timestamp
}

/**
 * Service for managing Quote/RFP Workflow data and operations.
 *
 * Handles HTTP communication with the backend API for quote CRUD,
 * session-storage draft persistence with debounced saves (3s), and
 * draft expiry (24 hours).
 */
@Injectable({ providedIn: 'root' })
export class QuoteWorkflowService {
  private readonly apiUrl = `${local_environment.apiUrl}/quotes`;
  private readonly DRAFT_KEY_PREFIX = 'frm_quote_draft';
  private readonly DEBOUNCE_MS = 3000;
  private readonly DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  private draftSave$ = new Subject<{ quoteId: string | null; step: QuoteStep; formValue: any }>();

  constructor(private http: HttpClient) {
    this.draftSave$
      .pipe(debounceTime(this.DEBOUNCE_MS))
      .subscribe(({ quoteId, step, formValue }) => this.writeDraft(quoteId, step, formValue));
  }

  // ===========================================================================
  // API Methods
  // ===========================================================================

  /**
   * Loads a single quote workflow by ID.
   * @param quoteId Quote identifier
   */
  getQuote(quoteId: string): Observable<QuoteWorkflow> {
    return this.http.get<QuoteWorkflow>(`${this.apiUrl}/${quoteId}`);
  }

  /**
   * Loads all quote workflows, optionally filtered.
   * @param filters Optional filters for status, client, project, etc.
   */
  getQuotes(filters?: QuoteFilters): Observable<QuoteWorkflow[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.clientName) {
        params = params.set('clientName', filters.clientName);
      }
      if (filters.projectName) {
        params = params.set('projectName', filters.projectName);
      }
      if (filters.createdBy) {
        params = params.set('createdBy', filters.createdBy);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo);
      }
    }
    return this.http.get<QuoteWorkflow[]>(this.apiUrl, { params });
  }

  /**
   * Creates a new quote workflow from RFP intake data.
   * @param rfpData RFP record data from the intake form
   */
  createQuote(rfpData: RfpRecord): Observable<QuoteWorkflow> {
    return this.http.post<QuoteWorkflow>(this.apiUrl, rfpData);
  }

  /**
   * Updates the RFP record on an existing quote.
   * @param quoteId Quote identifier
   * @param rfpData Updated RFP record data
   */
  updateRfp(quoteId: string, rfpData: RfpRecord): Observable<QuoteWorkflow> {
    return this.http.put<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/rfp`, rfpData);
  }

  /**
   * Converts a delivered quote into a Job.
   * @param quoteId Quote identifier
   * @param data Conversion data including PO number and SRI job number
   */
  convertToJob(quoteId: string, data: ConvertToJobData): Observable<{ job: Job; quote: QuoteWorkflow }> {
    return this.http.post<{ job: Job; quote: QuoteWorkflow }>(
      `${this.apiUrl}/${quoteId}/convert-to-job`,
      data
    );
  }

  /**
   * Records quote delivery to the customer.
   * @param quoteId Quote identifier
   * @param deliveryData Delivery record with recipient and method
   */
  markQuoteDelivered(quoteId: string, deliveryData: DeliveryRecord): Observable<QuoteWorkflow> {
    return this.http.put<QuoteWorkflow>(
      `${this.apiUrl}/${quoteId}/deliver`,
      deliveryData
    );
  }

  // ===========================================================================
  // Draft Persistence Methods
  // ===========================================================================

  /**
   * Queues a draft save with 3-second debounce to sessionStorage.
   * @param quoteId Quote identifier (null for new quotes)
   * @param step Workflow step identifier
   * @param formValue Current form state
   */
  saveDraft(quoteId: string | null, step: QuoteStep, formValue: any): void {
    this.draftSave$.next({ quoteId, step, formValue });
  }

  /**
   * Restores a previously saved draft from sessionStorage.
   * Discards drafts older than 24 hours.
   * @param quoteId Quote identifier (null for new quotes)
   * @param step Workflow step identifier
   * @returns The saved form value or null if none exists, expired, or parse fails
   */
  restoreDraft(quoteId: string | null, step: QuoteStep): any | null {
    try {
      const key = this.buildDraftKey(quoteId, step);
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const draft: QuoteDraft = JSON.parse(raw);

      // Discard drafts older than 24 hours
      const savedAt = new Date(draft.savedAt).getTime();
      if (isNaN(savedAt) || Date.now() - savedAt > this.DRAFT_MAX_AGE_MS) {
        sessionStorage.removeItem(key);
        return null;
      }

      return draft.formValue;
    } catch (e) {
      console.warn('QuoteWorkflowService: failed to restore draft', e);
      return null;
    }
  }

  /**
   * Removes the saved draft for a specific step from sessionStorage.
   * @param quoteId Quote identifier (null for new quotes)
   * @param step Workflow step identifier
   */
  clearDraft(quoteId: string | null, step: QuoteStep): void {
    try {
      sessionStorage.removeItem(this.buildDraftKey(quoteId, step));
    } catch (e) {
      console.warn('QuoteWorkflowService: failed to clear draft', e);
    }
  }

  /**
   * Removes all saved drafts for a quote from sessionStorage.
   * @param quoteId Quote identifier
   */
  clearAllDrafts(quoteId: string): void {
    const steps: QuoteStep[] = ['rfpIntake', 'jobSummary', 'bom', 'quoteAssembly'];
    steps.forEach(step => this.clearDraft(quoteId, step));
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Builds the sessionStorage key for a draft.
   * Format: frm_quote_draft_{quoteId}_{step}
   */
  private buildDraftKey(quoteId: string | null, step: QuoteStep): string {
    const id = quoteId ?? 'new';
    return `${this.DRAFT_KEY_PREFIX}_${id}_${step}`;
  }

  /**
   * Writes a draft to sessionStorage.
   */
  private writeDraft(quoteId: string | null, step: QuoteStep, formValue: any): void {
    try {
      const draft: QuoteDraft = {
        formValue,
        savedAt: new Date().toISOString()
      };
      sessionStorage.setItem(this.buildDraftKey(quoteId, step), JSON.stringify(draft));
    } catch (e) {
      console.warn('QuoteWorkflowService: failed to save draft', e);
    }
  }
}
