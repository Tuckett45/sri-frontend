/**
 * Budget API Service
 * 
 * Provides a validated API integration layer for budget operations.
 * Wraps HTTP calls with request validation and consistent error handling.
 * 
 * Endpoints:
 * - GET    /api/budgets/job/:jobId          - Get budget for a job
 * - POST   /api/budgets                     - Create a new budget
 * - POST   /api/budgets/:jobId/adjustments  - Create a budget adjustment
 * - GET    /api/budgets/:jobId/adjustments  - Get adjustment history
 * - POST   /api/budgets/:jobId/deductions   - Create a budget deduction
 * - GET    /api/budgets/:jobId/deductions   - Get deduction history
 * 
 * Requirements: 1.1-1.7, 2.1-2.8
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { JobBudget, BudgetAdjustment, BudgetDeduction, BudgetStatus } from '../models/budget.model';
import { CreateBudgetDto, AdjustBudgetDto, DeductHoursDto } from '../models/dtos/budget.dto';
import { BUDGET_ENDPOINTS } from './api-endpoints';
import {
  validateCreateBudget,
  validateAdjustBudget,
  validateDeductHours,
  validateId
} from './api-validators';

@Injectable({
  providedIn: 'root'
})
export class BudgetApiService {
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/budgets/job/:jobId
   * Retrieve budget for a specific job
   * Requirements: 1.1, 1.4, 1.5
   */
  getBudget(jobId: string): Observable<JobBudget> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<JobBudget>(BUDGET_ENDPOINTS.getBudget(jobId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getBudget'))
    );
  }

  /**
   * POST /api/budgets
   * Create a new budget for a job
   * Requirements: 1.1
   */
  createBudget(dto: CreateBudgetDto): Observable<JobBudget> {
    const validation = validateCreateBudget(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<JobBudget>(BUDGET_ENDPOINTS.createBudget(), dto).pipe(
      catchError(error => this.handleError(error, 'createBudget'))
    );
  }

  /**
   * POST /api/budgets/:jobId/adjustments
   * Create a manual budget adjustment
   * Requirements: 2.1-2.6
   */
  createAdjustment(jobId: string, dto: AdjustBudgetDto): Observable<BudgetAdjustment> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const validation = validateAdjustBudget(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<BudgetAdjustment>(
      BUDGET_ENDPOINTS.createAdjustment(jobId),
      dto
    ).pipe(
      catchError(error => this.handleError(error, 'createAdjustment'))
    );
  }

  /**
   * GET /api/budgets/:jobId/adjustments
   * Get budget adjustment history for a job
   * Requirements: 2.7
   */
  getAdjustments(jobId: string): Observable<BudgetAdjustment[]> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<BudgetAdjustment[]>(BUDGET_ENDPOINTS.getAdjustments(jobId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getAdjustments'))
    );
  }

  /**
   * POST /api/budgets/:jobId/deductions
   * Create a budget deduction from timecard entry
   * Requirements: 1.2, 1.3, 8.1, 8.2
   */
  createDeduction(jobId: string, dto: DeductHoursDto): Observable<JobBudget> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const validation = validateDeductHours(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<JobBudget>(
      BUDGET_ENDPOINTS.createDeduction(jobId),
      dto
    ).pipe(
      catchError(error => this.handleError(error, 'createDeduction'))
    );
  }

  /**
   * GET /api/budgets/:jobId/deductions
   * Get budget deduction history for a job
   * Requirements: 1.7
   */
  getDeductions(jobId: string): Observable<BudgetDeduction[]> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<BudgetDeduction[]>(BUDGET_ENDPOINTS.getDeductions(jobId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getDeductions'))
    );
  }

  /**
   * Calculate budget status from a budget object
   * Requirements: 1.6
   */
  calculateBudgetStatus(budget: JobBudget): BudgetStatus {
    if (budget.allocatedHours <= 0) {
      return BudgetStatus.OverBudget;
    }
    const percentConsumed = (budget.consumedHours / budget.allocatedHours) * 100;
    if (percentConsumed >= 100) {
      return BudgetStatus.OverBudget;
    } else if (percentConsumed >= 80) {
      return BudgetStatus.Warning;
    }
    return BudgetStatus.OnTrack;
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid budget data'; break;
        case 403: message = 'Insufficient permissions to modify budget'; break;
        case 404: message = 'Budget not found'; break;
        case 409: message = 'Budget conflict - may have been modified by another user'; break;
        case 500: message = 'Server error processing budget request'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`BudgetApiService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
