import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { local_environment } from '../../../../environments/environments';
import { QuoteDocument, QuoteEmailData, QuoteWorkflow } from '../models/quote-workflow.model';

/**
 * Service for managing Quote Document assembly, finalization, and delivery.
 *
 * Handles HTTP communication with the backend API for assembling the
 * Quote Document from approved components (Price Summary, SOW, BOM),
 * updating the Statement of Work, finalizing the quote, exporting to PDF,
 * and sending the quote to the customer.
 *
 * Requirements: 6.1–6.9, 7.1–7.6
 */
@Injectable({ providedIn: 'root' })
export class QuoteAssemblyService {
  private readonly apiUrl = `${local_environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  /**
   * Assembles the Quote Document for a quote with Validation_Approved status.
   * The document contains three sections: Price Summary, SOW, and BOM.
   * The Price Summary displays total labor cost, total material cost (marked-up subtotal),
   * and combined project total, respecting the client's tax/freight visibility configuration.
   * @param quoteId Quote identifier
   * @returns Observable of the assembled QuoteDocument
   */
  assembleQuoteDocument(quoteId: string): Observable<QuoteDocument> {
    return this.http.get<QuoteDocument>(`${this.apiUrl}/${quoteId}/document`);
  }

  /**
   * Updates the Statement of Work text on the Quote Document.
   * The SOW is pre-populated from the RFP_Record scope of work and can be
   * edited by the Authorized_Quoter before finalization (max 10000 characters).
   * @param quoteId Quote identifier
   * @param sowText Updated scope of work text
   * @returns Observable of the updated QuoteDocument
   */
  updateSow(quoteId: string, sowText: string): Observable<QuoteDocument> {
    return this.http.put<QuoteDocument>(`${this.apiUrl}/${quoteId}/document/sow`, { sowText });
  }

  /**
   * Finalizes the Quote Document, recording the timestamp and user identity.
   * Updates the Workflow_Status to Quote_Assembled.
   * Once finalized, the quote is ready for delivery to the customer.
   * @param quoteId Quote identifier
   * @returns Observable of the updated QuoteWorkflow
   */
  finalizeQuote(quoteId: string): Observable<QuoteWorkflow> {
    return this.http.post<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/finalize`, {});
  }

  /**
   * Exports the finalized Quote Document as a downloadable PDF.
   * The PDF includes the company logo, project name, client name, date,
   * Price Summary, SOW, and BOM sections.
   * @param quoteId Quote identifier
   * @returns Observable of the PDF as a Blob
   */
  exportPdf(quoteId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${quoteId}/document/pdf`, {
      responseType: 'blob'
    });
  }

  /**
   * Sends the finalized quote to the customer via email.
   * The email is pre-populated with the customer contact email from the RFP_Record,
   * a default subject line containing the project name, and the Quote Document PDF
   * as an attachment. After sending, the Workflow_Status is updated to Quote_Delivered
   * and the delivery timestamp and recipient email are recorded.
   * @param quoteId Quote identifier
   * @param emailData Email composition data including recipient, subject, body, and PDF attachment flag
   * @returns Observable of the updated QuoteWorkflow
   */
  sendToCustomer(quoteId: string, emailData: QuoteEmailData): Observable<QuoteWorkflow> {
    return this.http.post<QuoteWorkflow>(`${this.apiUrl}/${quoteId}/send`, emailData);
  }
}
