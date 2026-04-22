import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import {
  Material,
  MaterialTransaction,
  PurchaseOrder,
  ReorderRecommendation,
  Supplier,
  ConsumeMaterialDto,
  CreatePurchaseOrderDto,
  CreateMaterialDto,
  TransactionType,
  PurchaseOrderStatus,
  ReorderUrgency
} from '../models/material.model';
import { environment, local_environment } from '../../../../environments/environments';

/**
 * Service for managing materials tracking and supplier integration
 *
 * Implements:
 * - Material inventory management
 * - Material consumption and receipt tracking
 * - Purchase order creation and management
 * - Reorder recommendation generation
 * - Supplier integration logic
 *
 * Requirements: 7.1-7.13, 11.1-11.7
 */
@Injectable({
  providedIn: 'root'
})
export class MaterialsService {
  private readonly apiUrl = `${local_environment.apiUrl}/materials`;
  private readonly purchaseOrderUrl = `${local_environment.apiUrl}/purchase-orders`;
  private readonly supplierUrl = `${local_environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  /**
   * Get all materials
   * 
   * @returns Observable of material array
   * Requirements: 7.1
   */
  getMaterials(): Observable<Material[]> {
    return this.http.get<Material[]>(this.apiUrl).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Get a specific material by ID
   * 
   * @param materialId - Material identifier
   * @returns Observable of material
   * Requirements: 7.1
   */
  getMaterial(materialId: string): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${materialId}`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Create a new material
   * 
   * @param dto - Material creation data
   * @returns Observable of created material
   * Requirements: 7.1, 7.2, 7.4, 7.5
   */
  createMaterial(dto: CreateMaterialDto): Observable<Material> {
    return this.http.post<Material>(this.apiUrl, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Consume material for a job
   * Reduces material quantity and records transaction
   * 
   * @param dto - Material consumption data
   * @returns Observable of material transaction
   * Requirements: 7.9, 11.1, 11.2
   */
  consumeMaterial(dto: ConsumeMaterialDto): Observable<MaterialTransaction> {
    return this.http.post<MaterialTransaction>(
      `${this.apiUrl}/${dto.materialId}/consume`,
      dto
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Receive material from supplier
   * Increases material quantity and records transaction
   * 
   * @param materialId - Material identifier
   * @param quantity - Quantity received
   * @param supplierId - Supplier identifier
   * @param purchaseOrderId - Optional purchase order reference
   * @returns Observable of material transaction
   * Requirements: 7.8, 7.13
   */
  receiveMaterial(
    materialId: string,
    quantity: number,
    supplierId: string,
    purchaseOrderId?: string
  ): Observable<MaterialTransaction> {
    return this.http.post<MaterialTransaction>(
      `${this.apiUrl}/${materialId}/receive`,
      { quantity, supplierId, purchaseOrderId }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get transaction history for a material
   * 
   * @param materialId - Material identifier
   * @returns Observable of transaction array
   * Requirements: 7.10
   */
  getTransactionHistory(materialId: string): Observable<MaterialTransaction[]> {
    return this.http.get<MaterialTransaction[]>(
      `${this.apiUrl}/${materialId}/transactions`
    ).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Get materials by job
   * Returns all material transactions for a specific job
   * 
   * @param jobId - Job identifier
   * @returns Observable of transaction array
   * Requirements: 7.11, 11.2
   */
  getMaterialsByJob(jobId: string): Observable<MaterialTransaction[]> {
    const params = new HttpParams().set('jobId', jobId);
    return this.http.get<MaterialTransaction[]>(`${this.apiUrl}/transactions`, { params }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Calculate total material cost for a job
   * 
   * @param jobId - Job identifier
   * @returns Observable of total cost
   * Requirements: 7.11, 11.2
   */
  calculateJobMaterialCost(jobId: string): Observable<number> {
    return this.getMaterialsByJob(jobId).pipe(
      map(transactions => {
        return transactions
          .filter(t => t.transactionType === TransactionType.Consumption)
          .reduce((total, t) => total + t.totalCost, 0);
      })
    );
  }

  /**
   * Get reorder recommendations
   * Returns materials that have reached or fallen below reorder point
   * 
   * @returns Observable of reorder recommendation array
   * Requirements: 7.6
   */
  getReorderRecommendations(): Observable<ReorderRecommendation[]> {
    return this.http.get<ReorderRecommendation[]>(
      `${this.apiUrl}/reorder-recommendations`
    ).pipe(
      retry(2),
      map(recommendations => {
        // Calculate urgency based on how far below reorder point
        return recommendations.map(rec => ({
          ...rec,
          urgency: this.calculateReorderUrgency(rec)
        }));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Calculate reorder urgency based on current quantity vs reorder point
   * 
   * @param recommendation - Reorder recommendation
   * @returns Urgency level
   * Requirements: 7.6
   */
  private calculateReorderUrgency(recommendation: ReorderRecommendation): ReorderUrgency {
    const percentOfReorderPoint = (recommendation.currentQuantity / recommendation.reorderPoint) * 100;
    
    if (percentOfReorderPoint <= 0) {
      return ReorderUrgency.Critical; // Out of stock
    } else if (percentOfReorderPoint <= 25) {
      return ReorderUrgency.High; // 25% or less of reorder point
    } else if (percentOfReorderPoint <= 50) {
      return ReorderUrgency.Medium; // 50% or less of reorder point
    } else {
      return ReorderUrgency.Low; // Above 50% of reorder point
    }
  }

  /**
   * Create a purchase order
   * 
   * @param dto - Purchase order creation data
   * @returns Observable of created purchase order
   * Requirements: 7.6, 7.7, 7.13
   */
  createPurchaseOrder(dto: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.purchaseOrderUrl, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get purchase order by ID
   * 
   * @param poId - Purchase order identifier
   * @returns Observable of purchase order
   * Requirements: 7.7
   */
  getPurchaseOrder(poId: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.purchaseOrderUrl}/${poId}`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Get all purchase orders
   * 
   * @param status - Optional status filter
   * @returns Observable of purchase order array
   * Requirements: 7.7
   */
  getPurchaseOrders(status?: PurchaseOrderStatus): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<PurchaseOrder[]>(this.purchaseOrderUrl, { params }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Update purchase order status
   * 
   * @param poId - Purchase order identifier
   * @param status - New status
   * @returns Observable of updated purchase order
   * Requirements: 7.7, 7.13
   */
  updatePurchaseOrderStatus(poId: string, status: PurchaseOrderStatus): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(
      `${this.purchaseOrderUrl}/${poId}/status`,
      { status }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Submit purchase order to supplier (supplier automation)
   * 
   * @param poId - Purchase order identifier
   * @returns Observable of updated purchase order
   * Requirements: 7.7, 7.13
   */
  submitPurchaseOrderToSupplier(poId: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(
      `${this.purchaseOrderUrl}/${poId}/submit`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get all suppliers
   * 
   * @returns Observable of supplier array
   * Requirements: 7.2, 7.5
   */
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.supplierUrl).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Get supplier by ID
   * 
   * @param supplierId - Supplier identifier
   * @returns Observable of supplier
   * Requirements: 7.2, 7.5
   */
  getSupplier(supplierId: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.supplierUrl}/${supplierId}`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Import supplier inventory feed (supplier automation)
   * 
   * @param supplierId - Supplier identifier
   * @returns Observable of import result
   * Requirements: 7.13
   */
  importSupplierInventory(supplierId: string): Observable<{ imported: number; updated: number }> {
    return this.http.post<{ imported: number; updated: number }>(
      `${this.supplierUrl}/${supplierId}/import-inventory`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Adjust material inventory (for variance corrections)
   * 
   * @param materialId - Material identifier
   * @param quantity - Adjustment quantity (positive or negative)
   * @param reason - Reason for adjustment
   * @returns Observable of material transaction
   * Requirements: 11.5
   */
  adjustMaterialInventory(
    materialId: string,
    quantity: number,
    reason: string
  ): Observable<MaterialTransaction> {
    return this.http.post<MaterialTransaction>(
      `${this.apiUrl}/${materialId}/adjust`,
      { quantity, reason }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Calculate material cost variance for a job
   * 
   * @param jobId - Job identifier
   * @param estimatedCost - Estimated material cost
   * @returns Observable of variance calculation
   * Requirements: 11.7
   */
  calculateMaterialCostVariance(
    jobId: string,
    estimatedCost: number
  ): Observable<{ actualCost: number; variance: number; variancePercent: number }> {
    return this.calculateJobMaterialCost(jobId).pipe(
      map(actualCost => {
        const variance = actualCost - estimatedCost;
        const variancePercent = estimatedCost > 0 
          ? (variance / estimatedCost) * 100 
          : 0;
        
        return {
          actualCost,
          variance,
          variancePercent
        };
      })
    );
  }

  /**
   * Get material usage report by job type
   * 
   * @param startDate - Report start date
   * @param endDate - Report end date
   * @param jobType - Optional job type filter
   * @returns Observable of usage report
   * Requirements: 7.12
   */
  getMaterialUsageReport(
    startDate: Date,
    endDate: Date,
    jobType?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    
    if (jobType) {
      params = params.set('jobType', jobType);
    }
    
    return this.http.get(`${this.apiUrl}/usage-report`, { params }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  /**
   * Batch query transaction history for multiple materials.
   * Uses forkJoin to parallelize individual transaction queries.
   * @param materialIds Array of material IDs
   * @returns Observable of transactions grouped by material ID
   * Requirements: 7.10
   */
  getTransactionHistoryBatch(
    materialIds: string[]
  ): Observable<Map<string, MaterialTransaction[]>> {
    if (materialIds.length === 0) {
      return of(new Map<string, MaterialTransaction[]>());
    }

    const queries = materialIds.map(id =>
      this.getTransactionHistory(id).pipe(
        map(transactions => ({ id, transactions }))
      )
    );

    return forkJoin(queries).pipe(
      map(results => {
        const grouped = new Map<string, MaterialTransaction[]>();
        for (const { id, transactions } of results) {
          grouped.set(id, transactions);
        }
        return grouped;
      })
    );
  }

  /**
   * Handle HTTP errors
   * 
   * @param error - HTTP error response
   * @returns Observable that throws formatted error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid material data';
          break;
        case 403:
          errorMessage = 'Insufficient permissions to perform this operation';
          break;
        case 404:
          errorMessage = 'Material or resource not found';
          break;
        case 409:
          errorMessage = error.error?.message || 'Insufficient quantity or conflict';
          break;
        case 502:
          errorMessage = 'Supplier integration failed';
          break;
        default:
          errorMessage = `Server error: ${error.status}`;
      }
    }

    console.error('MaterialsService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
