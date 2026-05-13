import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { User } from '../models/user.model';
import { UserRole } from '../models/role.enum';
import {
  UserManagementFilters,
  UserUpdateRequest,
  BulkUserOperation,
  BulkOperationResult,
  AuditLogEntry,
  PasswordResetResponse
} from '../models/user-management.model';
import { AuthService } from './auth.service';

/**
 * Service for managing users and roles (Admin only)
 * Provides comprehensive user management capabilities including:
 * - User CRUD operations
 * - Role and market assignment
 * - Password management
 * - Bulk operations
 * - Audit logging
 */
@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly apiUrl = `${environment.apiUrl}/user-management`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get all users with optional filtering (Admin only)
   * @param filters Optional filters for role, market, approval status, and search term
   * @returns Observable of filtered user array
   */
  getUsers(filters?: UserManagementFilters): Observable<User[]> {
    this.checkAdminAccess();

    let params = new HttpParams();
    
    if (filters) {
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.market) {
        params = params.set('market', filters.market);
      }
      if (filters.isApproved !== undefined) {
        params = params.set('isApproved', filters.isApproved.toString());
      }
      if (filters.searchTerm) {
        params = params.set('search', filters.searchTerm);
      }
    }

    return this.http.get<User[]>(`${this.apiUrl}/users`, {
      ...this.httpOptions,
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new user (Admin only)
   * @param user Partial user object with required fields
   * @returns Observable of created user
   */
  createUser(user: Partial<User>): Observable<User> {
    this.checkAdminAccess();

    if (!user.email || !user.name || !user.role || !user.market) {
      return throwError(() => new Error('Missing required fields: email, name, role, and market are required'));
    }

    return this.http.post<User>(`${this.apiUrl}/users`, user, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing user (Admin only)
   * @param request Update request containing userId, updates, and optional reason
   * @returns Observable of updated user
   */
  updateUser(request: UserUpdateRequest): Observable<User> {
    this.checkAdminAccess();

    if (!request.userId) {
      return throwError(() => new Error('User ID is required'));
    }

    const payload = {
      updates: request.updates,
      reason: request.reason
    };

    return this.http.put<User>(
      `${this.apiUrl}/users/${request.userId}`,
      payload,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deactivate a user (Admin only)
   * @param userId ID of user to deactivate
   * @param reason Reason for deactivation
   * @returns Observable of void
   */
  deactivateUser(userId: string, reason: string): Observable<void> {
    this.checkAdminAccess();

    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    if (!reason || reason.trim().length === 0) {
      return throwError(() => new Error('Reason for deactivation is required'));
    }

    const payload = { reason };

    return this.http.post<void>(
      `${this.apiUrl}/users/${userId}/deactivate`,
      payload,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reset user password (Admin only)
   * Generates a secure temporary password
   * @param userId ID of user whose password to reset
   * @returns Observable with temporary password and expiration
   */
  resetUserPassword(userId: string): Observable<PasswordResetResponse> {
    this.checkAdminAccess();

    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/users/${userId}/reset-password`,
      {},
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Execute bulk operations on multiple users (Admin only)
   * @param operation Bulk operation details including operation type, user IDs, and reason
   * @returns Observable of operation results
   */
  executeBulkOperation(operation: BulkUserOperation): Observable<BulkOperationResult> {
    this.checkAdminAccess();

    if (!operation.userIds || operation.userIds.length === 0) {
      return throwError(() => new Error('At least one user ID is required'));
    }

    if (!operation.reason || operation.reason.trim().length === 0) {
      return throwError(() => new Error('Reason for bulk operation is required'));
    }

    const validOperations = ['activate', 'deactivate', 'change_role', 'change_market'];
    if (!validOperations.includes(operation.operation)) {
      return throwError(() => new Error(`Invalid operation: ${operation.operation}`));
    }

    if ((operation.operation === 'change_role' || operation.operation === 'change_market') && !operation.newValue) {
      return throwError(() => new Error(`New value is required for ${operation.operation} operation`));
    }

    return this.http.post<BulkOperationResult>(
      `${this.apiUrl}/users/bulk`,
      operation,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get audit log for a specific user (Admin only)
   * @param userId ID of user to retrieve audit log for
   * @returns Observable of audit log entries
   */
  getUserAuditLog(userId: string): Observable<AuditLogEntry[]> {
    this.checkAdminAccess();

    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    return this.http.get<AuditLogEntry[]>(
      `${this.apiUrl}/users/${userId}/audit-log`,
      this.httpOptions
    ).pipe(
      map(entries => entries.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))),
      catchError(this.handleError)
    );
  }

  /**
   * Check if current user has Admin access
   * @throws Error if user is not an Admin
   */
  private checkAdminAccess(): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || error.message || `Error Code: ${error.status}`;
    }

    console.error('UserManagementService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
