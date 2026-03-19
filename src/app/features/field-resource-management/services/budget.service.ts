import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { 
  JobBudget, 
  BudgetAdjustment, 
  BudgetDeduction,
  BudgetStatus 
} from '../models/budget.model';
import { 
  CreateBudgetDto, 
  AdjustBudgetDto 
} from '../models/dtos/budget.dto';
import { CacheService } from './cache.service';

/** 5 minutes in milliseconds — budget status changes frequently */
const BUDGET_CACHE_TTL = 5 * 60 * 1000;

/**
 * Service for managing job budget operations and calculations.
 * Budget data is cached with a 5-minute TTL and invalidated on mutations.
 */
@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private readonly apiUrl = '/api/budgets';
  private readonly retryCount = 2;

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Get budget for a job (cached for 5 minutes)
   * @param jobId The ID of the job
   * @returns Observable of JobBudget
   */
  getBudget(jobId: string): Observable<JobBudget> {
    const cacheKey = `budget:${jobId}`;
    
    return this.cacheService.get(cacheKey, () => {
      return this.http.get<JobBudget>(`${this.apiUrl}/job/${jobId}`).pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
    }, BUDGET_CACHE_TTL);
  }

  /**
   * Create initial budget for a job
   * @param dto Create budget data transfer object
   * @returns Observable of created JobBudget
   */
  createBudget(dto: CreateBudgetDto): Observable<JobBudget> {
    return this.http.post<JobBudget>(this.apiUrl, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Adjust budget manually (invalidates budget cache)
   * @param jobId The ID of the job
   * @param dto Adjust budget data transfer object
   * @returns Observable of BudgetAdjustment record
   */
  adjustBudget(jobId: string, dto: AdjustBudgetDto): Observable<BudgetAdjustment> {
    return this.http.post<BudgetAdjustment>(
      `${this.apiUrl}/${jobId}/adjustments`, 
      dto
    ).pipe(
      tap(() => this.cacheService.invalidate(`budget:${jobId}`)),
      catchError(this.handleError)
    );
  }

  /**
   * Deduct hours from budget (invalidates budget cache)
   * @param jobId The ID of the job
   * @param hours Number of hours to deduct
   * @param timecardEntryId The ID of the timecard entry
   * @returns Observable of updated JobBudget
   */
  deductHours(jobId: string, hours: number, timecardEntryId: string): Observable<JobBudget> {
    return this.http.post<JobBudget>(
      `${this.apiUrl}/${jobId}/deductions`,
      { hours, timecardEntryId }
    ).pipe(
      tap(() => this.cacheService.invalidate(`budget:${jobId}`)),
      catchError(this.handleError)
    );
  }

  /**
   * Get budget adjustment history
   * @param jobId The ID of the job
   * @returns Observable of BudgetAdjustment array
   */
  getAdjustmentHistory(jobId: string): Observable<BudgetAdjustment[]> {
    return this.http.get<BudgetAdjustment[]>(
      `${this.apiUrl}/${jobId}/adjustments`
    ).pipe(
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Get budget deduction history
   * @param jobId The ID of the job
   * @returns Observable of BudgetDeduction array
   */
  getDeductionHistory(jobId: string): Observable<BudgetDeduction[]> {
    return this.http.get<BudgetDeduction[]>(
      `${this.apiUrl}/${jobId}/deductions`
    ).pipe(
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Calculate budget status based on consumed vs allocated hours
   * @param budget The job budget to calculate status for
   * @returns BudgetStatus enum value
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
    } else {
      return BudgetStatus.OnTrack;
    }
  }

  /**
   * Handle HTTP errors with user-friendly messages
   * @param error The HTTP error response
   * @returns Observable that throws an error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid budget data';
          break;
        case 403:
          errorMessage = 'Insufficient permissions to modify budget';
          break;
        case 404:
          errorMessage = 'Budget not found';
          break;
        case 409:
          errorMessage = 'Budget conflict - the budget may have been modified by another user';
          break;
        case 500:
          errorMessage = 'Server error occurred while processing budget request';
          break;
        default:
          errorMessage = `Server error: ${error.status}`;
      }
    }
    
    // Log error to console for debugging
    console.error('BudgetService error:', errorMessage, error);
    
    return throwError(() => new Error(errorMessage));
  }
}
