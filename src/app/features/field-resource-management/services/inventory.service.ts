import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, retry, tap, map } from 'rxjs/operators';
import { 
  InventoryItem, 
  InventoryLocationHistory, 
  InventoryFilters,
  LocationType 
} from '../models/inventory.model';
import { 
  CreateInventoryItemDto, 
  AssignInventoryDto 
} from '../models/dtos/inventory.dto';
import { CacheService } from './cache.service';

/** 2 minutes in milliseconds — inventory availability changes frequently */
const INVENTORY_AVAILABILITY_CACHE_TTL = 2 * 60 * 1000;

/**
 * Service for managing inventory tracking and location assignments.
 * Availability checks are cached with a 2-minute TTL and invalidated on assignment.
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = '/api/inventory';
  
  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}
  
  /**
   * Get inventory items with optional filtering
   * @param filters Optional filters to apply
   * @returns Observable array of inventory items
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
    
    return this.http.get<InventoryItem[]>(this.apiUrl, { params }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }
  
  /**
   * Get a single inventory item by ID
   * @param itemId The inventory item ID
   * @returns Observable of inventory item
   */
  getInventoryItem(itemId: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/${itemId}`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }
  
  /**
   * Create a new inventory item
   * @param dto The inventory item creation data
   * @returns Observable of created inventory item
   */
  createInventoryItem(dto: CreateInventoryItemDto): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(this.apiUrl, dto).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Assign inventory item to a job (invalidates availability cache)
   * @param itemId The inventory item ID
   * @param jobId The job ID
   * @param reason Optional reason for assignment
   * @returns Observable of updated inventory item
   */
  assignToJob(itemId: string, jobId: string, reason?: string): Observable<InventoryItem> {
    const dto: AssignInventoryDto = {
      locationType: LocationType.Job,
      locationId: jobId,
      reason
    };
    
    return this.http.post<InventoryItem>(
      `${this.apiUrl}/${itemId}/assign`,
      dto
    ).pipe(
      tap(() => this.cacheService.invalidate(`inventory-availability:${itemId}`)),
      catchError(this.handleError)
    );
  }
  
  /**
   * Assign inventory item to a technician (invalidates availability cache)
   * @param itemId The inventory item ID
   * @param technicianId The technician ID
   * @param reason Optional reason for assignment
   * @returns Observable of updated inventory item
   */
  assignToTechnician(itemId: string, technicianId: string, reason?: string): Observable<InventoryItem> {
    const dto: AssignInventoryDto = {
      locationType: LocationType.Technician,
      locationId: technicianId,
      reason
    };
    
    return this.http.post<InventoryItem>(
      `${this.apiUrl}/${itemId}/assign`,
      dto
    ).pipe(
      tap(() => this.cacheService.invalidate(`inventory-availability:${itemId}`)),
      catchError(this.handleError)
    );
  }
  
  /**
   * Assign inventory item to a vendor (invalidates availability cache)
   * @param itemId The inventory item ID
   * @param vendorId The vendor ID
   * @param reason Optional reason for assignment
   * @returns Observable of updated inventory item
   */
  assignToVendor(itemId: string, vendorId: string, reason?: string): Observable<InventoryItem> {
    const dto: AssignInventoryDto = {
      locationType: LocationType.Vendor,
      locationId: vendorId,
      reason
    };
    
    return this.http.post<InventoryItem>(
      `${this.apiUrl}/${itemId}/assign`,
      dto
    ).pipe(
      tap(() => this.cacheService.invalidate(`inventory-availability:${itemId}`)),
      catchError(this.handleError)
    );
  }
  
  /**
   * Get location history for an inventory item
   * @param itemId The inventory item ID
   * @returns Observable array of location history entries
   */
  getLocationHistory(itemId: string): Observable<InventoryLocationHistory[]> {
    return this.http.get<InventoryLocationHistory[]>(
      `${this.apiUrl}/${itemId}/history`
    ).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }
  
  /**
   * Check if an inventory item is available for assignment (cached for 2 minutes)
   * @param itemId The inventory item ID
   * @returns Observable boolean indicating availability
   */
  checkAvailability(itemId: string): Observable<boolean> {
    const cacheKey = `inventory-availability:${itemId}`;
    
    return this.cacheService.get(cacheKey, () => {
      return this.http.get<boolean>(
        `${this.apiUrl}/${itemId}/availability`
      ).pipe(
        retry(2),
        catchError(this.handleError)
      );
    }, INVENTORY_AVAILABILITY_CACHE_TTL);
  }
  
  /**
   * Get inventory items that are low on stock
   * @returns Observable array of low stock inventory items
   */
  getLowStockItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.apiUrl}/low-stock`
    ).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }
  
  /**
   * Batch query inventory items by multiple locations.
   * Uses forkJoin to parallelize individual location queries.
   * @param locations Array of { locationType, locationId } pairs
   * @returns Observable of inventory items grouped by location key ("type:id")
   * Requirements: 6.9
   */
  getInventoryByLocations(
    locations: { locationType: LocationType; locationId: string }[]
  ): Observable<Map<string, InventoryItem[]>> {
    if (locations.length === 0) {
      return of(new Map<string, InventoryItem[]>());
    }

    const queries = locations.map(loc =>
      this.getInventory({ locationType: loc.locationType, locationId: loc.locationId }).pipe(
        map(items => ({ key: `${loc.locationType}:${loc.locationId}`, items }))
      )
    );

    return forkJoin(queries).pipe(
      map(results => {
        const grouped = new Map<string, InventoryItem[]>();
        for (const { key, items } of results) {
          grouped.set(key, items);
        }
        return grouped;
      })
    );
  }

  /**
   * Handle HTTP errors
   * @param error The HTTP error response
   * @returns Observable that throws an error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid inventory data';
          break;
        case 403:
          errorMessage = 'Insufficient permissions';
          break;
        case 404:
          errorMessage = 'Inventory item not found';
          break;
        case 409:
          errorMessage = 'Item not available - already assigned or in use';
          break;
        default:
          errorMessage = `Server error: ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
