import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { INTEGRATION_HUB_ENDPOINTS } from '../api/atlas-lifecycle-endpoints';
import {
  CreateSpectrumJobRequest,
  SpectrumJobResult,
  SubmitProcurementOrderRequest,
  ProcurementOrderResult,
  BookTravelRequest,
  TravelBookingResult,
  ProcessInvoiceRequest,
  InvoiceResult,
  IntegrationHealthStatus
} from '../models/atlas-lifecycle.models';

/**
 * Integration Hub Service
 *
 * Consumes the SRI Project Lifecycle API's IntegrationHub to provide
 * access to external system integrations from the frontend:
 * - Spectrum job creation (job scheduling system)
 * - Procurement order submission
 * - Travel booking
 * - Invoice processing (accounting)
 * - Integration health monitoring
 *
 * These capabilities exist in the atlas-platform backend
 * (IntegrationsController) but were previously not exposed to the frontend.
 * PMs can now trigger these operations directly from Phase Dashboard.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationHubService {
  private readonly retryCount = 1;

  constructor(private http: HttpClient) {}

  // ─── Spectrum (Job Scheduling) ──────────────────────────────────────────────

  /**
   * Create a Spectrum job for a project.
   * Used during the PLANNING phase to register jobs in the scheduling system.
   *
   * Backend: POST /api/Integrations/spectrum/jobs
   */
  createSpectrumJob(request: CreateSpectrumJobRequest): Observable<SpectrumJobResult> {
    return this.http.post<SpectrumJobResult>(
      INTEGRATION_HUB_ENDPOINTS.createSpectrumJob(),
      request
    ).pipe(
      catchError(error => this.handleError(error, 'createSpectrumJob'))
    );
  }

  // ─── Procurement ────────────────────────────────────────────────────────────

  /**
   * Submit a procurement order for materials/equipment.
   * Used during PLANNING/EXECUTING phases for material ordering.
   *
   * Backend: POST /api/Integrations/procurement/orders
   */
  submitProcurementOrder(request: SubmitProcurementOrderRequest): Observable<ProcurementOrderResult> {
    return this.http.post<ProcurementOrderResult>(
      INTEGRATION_HUB_ENDPOINTS.submitProcurementOrder(),
      request
    ).pipe(
      catchError(error => this.handleError(error, 'submitProcurementOrder'))
    );
  }

  // ─── Travel ─────────────────────────────────────────────────────────────────

  /**
   * Book travel for project team members.
   * Used during PLANNING/EXECUTING phases for logistics coordination.
   *
   * Backend: POST /api/Integrations/travel/bookings
   */
  bookTravel(request: BookTravelRequest): Observable<TravelBookingResult> {
    return this.http.post<TravelBookingResult>(
      INTEGRATION_HUB_ENDPOINTS.bookTravel(),
      request
    ).pipe(
      catchError(error => this.handleError(error, 'bookTravel'))
    );
  }

  // ─── Accounting (Invoices) ──────────────────────────────────────────────────

  /**
   * Process an invoice through the accounting integration.
   * Used during MONITORING/CLOSE phases for financial reconciliation.
   *
   * Backend: POST /api/Integrations/accounting/invoices
   */
  processInvoice(request: ProcessInvoiceRequest): Observable<InvoiceResult> {
    return this.http.post<InvoiceResult>(
      INTEGRATION_HUB_ENDPOINTS.processInvoice(),
      request
    ).pipe(
      catchError(error => this.handleError(error, 'processInvoice'))
    );
  }

  // ─── Health Monitoring ──────────────────────────────────────────────────────

  /**
   * Get health status of all integration connections.
   * Useful for admin dashboards to monitor external system availability.
   *
   * Backend: GET /api/Integrations/health
   */
  getIntegrationHealth(): Observable<IntegrationHealthStatus> {
    return this.http.get<IntegrationHealthStatus>(
      INTEGRATION_HUB_ENDPOINTS.getIntegrationHealth()
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getIntegrationHealth'))
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = `Invalid request: ${error.error?.error || 'Bad request'}`; break;
        case 403: message = 'Insufficient permissions for integration operation'; break;
        case 404: message = 'Integration endpoint not found'; break;
        case 409: message = 'Integration conflict - operation already in progress'; break;
        case 500: message = `Integration error: ${error.error?.error || 'Server error'}`; break;
        case 502: message = 'External integration system unreachable'; break;
        case 503: message = 'Integration service temporarily unavailable'; break;
        default: message = `Integration error: ${error.status}`;
      }
    }

    console.error(`IntegrationHubService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
