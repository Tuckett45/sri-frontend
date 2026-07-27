import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { local_environment } from '../../../../environments/environments';
import { BomData, QuoteWorkflow } from '../models/quote-workflow.model';

/**
 * Service for managing BOM (Bill of Materials) persistence.
 *
 * Handles HTTP communication with the backend API for saving
 * and completing BOM data within the quote workflow.
 */
@Injectable({ providedIn: 'root' })
export class BomService {
  private readonly apiUrl = `${local_environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  /**
   * Saves BOM data for a quote, maintaining the workflow status as BOM_In_Progress.
   * @param quoteId Quote identifier
   * @param data BOM data including line items, markup, tax, and freight
   * @returns Observable of the updated QuoteWorkflow
   */
  saveBom(quoteId: string, data: BomData): Observable<QuoteWorkflow> {
    return this.http.put<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/bom`, data);
  }

  /**
   * Marks the BOM as complete, triggering the next workflow step.
   * The backend validates that at least one BOM line item exists before allowing completion.
   * @param quoteId Quote identifier
   * @returns Observable of the updated QuoteWorkflow
   */
  completeBom(quoteId: string): Observable<QuoteWorkflow> {
    return this.http.post<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/bom/complete`, {});
  }
}
