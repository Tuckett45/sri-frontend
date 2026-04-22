/**
 * Inventory API Service
 * 
 * Provides a validated API integration layer for inventory management operations.
 * Wraps HTTP calls with request validation and consistent error handling.
 * 
 * Endpoints:
 * - GET  /api/inventory                    - Get inventory with filtering
 * - POST /api/inventory                    - Create a new inventory item
 * - GET  /api/inventory/:itemId            - Get a single inventory item
 * - POST /api/inventory/:itemId/assign     - Assign inventory to location
 * - GET  /api/inventory/:itemId/history    - Get location history
 * - GET  /api/inventory/low-stock          - Get low stock items
 * 
 * Requirements: 6.1-6.11, 10.1-10.6
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {
  InventoryItem,
  InventoryLocationHistory,
  InventoryFilters,
  LocationType
} from '../models/inventory.model';
import { CreateInventoryItemDto, AssignInventoryDto } from '../models/dtos/inventory.dto';
import { INVENTORY_ENDPOINTS } from './api-endpoints';
import {
  validateCreateInventoryItem,
  validateAssignInventory,
  validateId
} from './api-validators';

@Injectable({
  providedIn: 'root'
})
export class InventoryApiService {
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/inventory
   * Retrieve inventory items with optional filtering
   * Requirements: 6.1-6.4, 6.9
   */
  getInventory(filters?: InventoryFilters): Observable<InventoryItem[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.searchTerm) {
        params = params.set('search', filters.searchTerm);
      }
      if (filters.category) {
        params = params.set('category', filters.category);
      }
      if (filters.locationType) {
        params = params.set('locationType', filters.locationType);
      }
      if (filters.locationId) {
        params = params.set('locationId', filters.locationId);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.lowStock) {
        params = params.set('lowStock', 'true');
      }
    }

    return this.http.get<InventoryItem[]>(INVENTORY_ENDPOINTS.getInventory(), { params }).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getInventory'))
    );
  }

  /**
   * POST /api/inventory
   * Create a new inventory item
   * Requirements: 6.1-6.4
   */
  createItem(dto: CreateInventoryItemDto): Observable<InventoryItem> {
    const validation = validateCreateInventoryItem(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<InventoryItem>(INVENTORY_ENDPOINTS.createItem(), dto).pipe(
      catchError(error => this.handleError(error, 'createItem'))
    );
  }

  /**
   * GET /api/inventory/:itemId
   * Retrieve a single inventory item by ID
   * Requirements: 6.1
   */
  getItem(itemId: string): Observable<InventoryItem> {
    const idValidation = validateId(itemId, 'itemId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<InventoryItem>(INVENTORY_ENDPOINTS.getItem(itemId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getItem'))
    );
  }

  /**
   * POST /api/inventory/:itemId/assign
   * Assign inventory item to a job, technician, or vendor
   * Requirements: 6.5-6.7, 10.1-10.2, 10.5
   */
  assignItem(itemId: string, dto: AssignInventoryDto): Observable<InventoryItem> {
    const idValidation = validateId(itemId, 'itemId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const validation = validateAssignInventory(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<InventoryItem>(
      INVENTORY_ENDPOINTS.assignItem(itemId),
      dto
    ).pipe(
      catchError(error => this.handleError(error, 'assignItem'))
    );
  }

  /**
   * GET /api/inventory/:itemId/history
   * Get location history for an inventory item
   * Requirements: 6.8
   */
  getHistory(itemId: string): Observable<InventoryLocationHistory[]> {
    const idValidation = validateId(itemId, 'itemId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<InventoryLocationHistory[]>(
      INVENTORY_ENDPOINTS.getHistory(itemId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getHistory'))
    );
  }

  /**
   * GET /api/inventory/low-stock
   * Get inventory items that are below minimum threshold
   * Requirements: 6.11
   */
  getLowStock(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(INVENTORY_ENDPOINTS.getLowStock()).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getLowStock'))
    );
  }

  /**
   * GET /api/inventory/:itemId/availability
   * Check if an inventory item is available for assignment
   * Requirements: 10.2, 10.5
   */
  checkAvailability(itemId: string): Observable<boolean> {
    const idValidation = validateId(itemId, 'itemId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<boolean>(INVENTORY_ENDPOINTS.checkAvailability(itemId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'checkAvailability'))
    );
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid inventory data'; break;
        case 403: message = 'Insufficient permissions'; break;
        case 404: message = 'Inventory item not found'; break;
        case 409: message = 'Item not available - already assigned or in use'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`InventoryApiService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
