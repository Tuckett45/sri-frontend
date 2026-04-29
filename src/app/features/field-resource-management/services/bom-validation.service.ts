import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { local_environment } from '../../../../environments/environments';
import { ValidationRequest, ValidationStepEntry } from '../models/quote-workflow.model';

/**
 * Service for managing BOM (Bill of Materials) validation workflow.
 *
 * Handles HTTP communication with the backend API for initiating,
 * approving, rejecting, and tracking BOM validation requests within
 * the quote workflow. Integrates with the ATLAS workflow system for
 * trackable validation steps and automated email notifications.
 *
 * Requirements: 5.1–5.14
 */
@Injectable({ providedIn: 'root' })
export class BomValidationService {
  private readonly apiUrl = `${local_environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  /**
   * Initiates a BOM validation request for a quote.
   * The backend sends an automated email notification to the assigned BOM_Validator
   * and registers validation steps in the ATLAS workflow system.
   * Updates the Workflow_Status to Pending_Validation.
   * @param quoteId Quote identifier
   * @returns Observable of the created ValidationRequest
   */
  initiateValidation(quoteId: string): Observable<ValidationRequest> {
    return this.http.post<ValidationRequest>(`${this.apiUrl}/${quoteId}/validation`, {});
  }

  /**
   * Approves the BOM for a quote, advancing the workflow.
   * The backend records the validator's identity and timestamp, updates the
   * Validation_Request step to Approved, and sends an approval notification
   * email to the Authorized_Quoter. Updates the Workflow_Status to Validation_Approved.
   * @param quoteId Quote identifier
   * @returns Observable of the updated ValidationRequest
   */
  approveBom(quoteId: string): Observable<ValidationRequest> {
    return this.http.put<ValidationRequest>(`${this.apiUrl}/${quoteId}/validation/approve`, {});
  }

  /**
   * Rejects the BOM for a quote, requiring revision.
   * The backend records the validator's identity, timestamp, and rejection comments,
   * updates the Validation_Request step to Rejected, and sends a rejection notification
   * email with comments to the Authorized_Quoter. Updates the Workflow_Status to
   * Validation_Rejected, allowing the quoter to revise and resubmit the BOM.
   * @param quoteId Quote identifier
   * @param comments Rejection comments explaining the reason (non-empty, max 2000 chars)
   * @returns Observable of the updated ValidationRequest
   */
  rejectBom(quoteId: string, comments: string): Observable<ValidationRequest> {
    return this.http.put<ValidationRequest>(`${this.apiUrl}/${quoteId}/validation/reject`, { comments });
  }

  /**
   * Retrieves the validation history for a quote, including all validation steps
   * with timestamps and actor identities for audit purposes.
   * @param quoteId Quote identifier
   * @returns Observable of the validation step entries
   */
  getValidationHistory(quoteId: string): Observable<ValidationStepEntry[]> {
    return this.http.get<ValidationStepEntry[]>(`${this.apiUrl}/${quoteId}/validation/history`);
  }
}
